import "dotenv/config";


function requireEnv(
 name:string
):string{

 const value =
 process.env[name];


 if(!value){

  throw new Error(
   `Missing ${name}`
  );

 }


 return value;

}



export const config={

 llm:{

  apiKey:
  requireEnv(
   "LLM_API_KEY"
  ),


  baseURL:
  requireEnv(
   "LLM_BASE_URL"
  ),


  model:
  requireEnv(
   "LLM_MODEL"
  )

 }

};