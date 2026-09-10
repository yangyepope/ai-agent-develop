import { codeAssistantSystemPrompt } from "../prompts/code-assistant.prompt.ts";
import { Conversation } from "../services/conversation.service.ts";
import type { LLMRequestOptions } from "../services/llm.service.ts";

/**
 * 待分析的 Java 代码。
 *
 * 这段代码里埋了几个典型问题，用来观察助手的分析效果：
 * - 安全问题：keyword 直接拼进 SQL，存在注入风险
 * - 性能问题：循环内逐条查询订单（N+1）、SELECT *
 * - 代码问题：catch 里吞掉异常、日志打印完整对象
 */
const javaCode = `
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /** 按关键字搜索用户，并填充其订单列表 */
    public List<User> search(String keyword) {
        String sql = "SELECT * FROM t_user WHERE name LIKE '%" + keyword + "%'";
        List<User> users = jdbcTemplate.query(sql, new BeanPropertyRowMapper<>(User.class));

        for (User user : users) {
            List<Order> orders = jdbcTemplate.query(
                    "SELECT * FROM t_order WHERE user_id = " + user.getId(),
                    new BeanPropertyRowMapper<>(Order.class));
            user.setOrders(orders);
        }

        log.info("search keyword={}, result={}", keyword, users);
        return users;
    }

    public void deleteById(Long id) {
        try {
            jdbcTemplate.update("DELETE FROM t_user WHERE id = ?", id);
        } catch (Exception e) {
            // 忽略删除失败
        }
    }
}
`.trim();

interface Turn {
  question: string;
  options?: LLMRequestOptions;
}

/**
 * 三轮提问。
 *
 * 只有第一轮带了代码，后两轮都是没头没尾的追问 ——
 * 能不能答对，全看 messages 里保存的历史有没有一起发过去。
 */
const turns: Turn[] = [
  {
    question: `请分析以下 Java 代码：\n\n\`\`\`java\n${javaCode}\n\`\`\``,
  },
  {
    question: "你刚才说的第二个问题怎么解决？",
  },
  {
    question: "那修改后的完整代码给我。",
    // maxTokens 是「总输出上限」，含推理模型的思考 token。
    // 设 100 时思考会吃掉大部分预算，正文很短甚至为空 ——
    // 想看截断效果就留着，想拿到完整代码就调大到 4000 以上。
    options: { maxTokens: 1000 },
  },
];

async function runTurn(
  conversation: Conversation,
  index: number,
  turn: Turn,
): Promise<void> {
  console.log(`\n\n===== 第 ${index} 轮 =====\n`);
  console.log(`用户：${turn.question}\n`);

  const response = await conversation.ask(
    turn.question,
    turn.options ?? {},
  );

  console.log(
    `\n[本轮 token] prompt=${response.promptTokens} completion=${response.completionTokens} total=${response.totalTokens} finish=${response.finishReason}`,
  );
}

async function main(): Promise<void> {
  const conversation = new Conversation(
    codeAssistantSystemPrompt,
    {
      temperature: 0.2,
      
      // 三轮共用的默认上限，单轮可用 turn.options 覆盖（第三轮就是）。
      // 它是「总输出上限」，含推理模型的思考 token —— 思考先占掉一部分，
      // 剩下的才留给正文，所以别设得太小。
      maxTokens: 3000,
      // 分析类回答很长，实测同一模型生成上千 token 需要 1 分钟以上，
      // 默认的 30s 必然超时，这里放宽到 3 分钟
      timeoutMs: 180_000,
      maxRetries: 2,
    },
  );

  for (const [index, turn] of turns.entries()) {
    await runTurn(conversation, index + 1, turn);
  }

  console.log("\n\n===== 最终 messages 结构 =====\n");

  conversation.printHistory();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
