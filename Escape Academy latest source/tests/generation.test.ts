import assert from "node:assert/strict";
import test from "node:test";
import { prepareAdventure } from "../lib/generate";
import { defaultSetup, sampleFor } from "../lib/samples";
import { validatePlan, type Adventure } from "../lib/plan";

const sample=()=>structuredClone(sampleFor(defaultSetup).plan);
function switchPlan():Adventure {
  const plan=sample();
  plan.rooms[2].puzzle={
    type:"switches",name:"Switches",prompt:"Activate A and B.",
    options:["A","B","C","D"],labels:[],solution:["A","B"],
    explanation:"A and B satisfy the rule.",hints:["Look at the rule.","A is correct.","Choose A and B."],
  };
  return plan;
}
function geminiReply(plan:Adventure){
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(plan)}]}}]}),{status:200});
}
function puzzleTypes(schema:any):string[]{return schema.properties.rooms.items.properties.puzzle.properties.type.enum;}

test("sample adventures provide valid questions at every prerequisite station",()=>{
  for(const topic of ["Fractions","The water cycle","Ancient Egypt","Chemistry","Ecology","Ocean zones"]){
    for(const minutes of [5,10,15] as const){
      const plan=sampleFor({...defaultSetup,topic,minutes}).plan;
      for(const room of plan.rooms){
        assert.ok(room.stationQuestions);
        for(const question of Object.values(room.stationQuestions)){
          assert.equal(new Set(question.options).size,3);
          assert.ok(question.options.includes(question.answer));
        }
      }
    }
  }
});

test("station questions must have distinct choices and a matching answer",()=>{
  const invalid=sample();
  invalid.rooms[0].stationQuestions![0].answer="not an option";
  assert.throws(()=>validatePlan(invalid),/notes question/);
  const duplicate=sample();
  duplicate.rooms[0].stationQuestions![3].options[1]=duplicate.rooms[0].stationQuestions![3].options[0];
  assert.throws(()=>validatePlan(duplicate),/equipment question/);
});

test("valid routes remain supported in authored plans and first Gemini requests",async t=>{
  const plan=sample();
  assert.ok(plan.rooms.some(room=>room.puzzle.type==="route"));
  assert.doesNotThrow(()=>validatePlan(plan,defaultSetup.minutes));
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  let request:any;
  globalThis.fetch=(async (_url,options)=>{request=JSON.parse(String(options?.body));return geminiReply(plan);}) as typeof fetch;
  const result=await prepareAdventure(defaultSetup,"test-key","test-model",true);
  assert.equal(result.source,"ai");
  assert.ok(puzzleTypes(request.generationConfig.responseJsonSchema).includes("route"));
});

test("a route failure switches Gemini retries to switches, even after a different error",async t=>{
  const invalidRoute=sample();
  invalidRoute.rooms[2].puzzle.solution=[invalidRoute.rooms[2].puzzle.options[0],invalidRoute.rooms[2].puzzle.options[8]];
  const invalidCode=switchPlan();
  invalidCode.rooms[1].puzzle={type:"code",name:"Code",prompt:"Enter a code.",options:[],labels:[],solution:["1"],explanation:"Use the answer.",hints:["Hint one","Hint two","Hint three"]};
  const replies=[invalidRoute,invalidCode,switchPlan()];
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  const requests:any[]=[];
  globalThis.fetch=(async (_url,options)=>{requests.push(JSON.parse(String(options?.body)));return geminiReply(replies[requests.length-1]);}) as typeof fetch;
  const result=await prepareAdventure(defaultSetup,"test-key","test-model",true);
  assert.equal(result.source,"ai");assert.equal(requests.length,3);
  assert.ok(puzzleTypes(requests[0].generationConfig.responseJsonSchema).includes("route"));
  for(const request of requests.slice(1)){
    const types=puzzleTypes(request.generationConfig.responseJsonSchema);
    assert.ok(!types.includes("route"));assert.ok(types.includes("switches"));
    assert.match(request.systemInstruction.parts[0].text,/Replace the failed route puzzle with a switches puzzle/);
  }
  assert.match(requests[1].contents[0].parts[0].text,/Room 3 route puzzle/);
  assert.match(requests[2].contents[0].parts[0].text,/Room 2 code puzzle/);
});

test("schema errors produce concise field-specific retry feedback",async t=>{
  const invalid=switchPlan();invalid.rooms[0].name="";
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  const requests:any[]=[];
  globalThis.fetch=(async (_url,options)=>{requests.push(JSON.parse(String(options?.body)));return geminiReply(requests.length===1?invalid:switchPlan());}) as typeof fetch;
  const result=await prepareAdventure(defaultSetup,"test-key","test-model",true);
  assert.equal(result.source,"ai");assert.match(requests[1].contents[0].parts[0].text,/rooms\.0\.name:/);
  assert.ok(!requests[1].contents[0].parts[0].text.includes('"issues"'));
});

test("a route schema error also excludes routes from the next Gemini retry",async t=>{
  const invalid=sample();invalid.rooms[2].puzzle.options[0]="A".repeat(73);
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  const requests:any[]=[];
  globalThis.fetch=(async (_url,options)=>{requests.push(JSON.parse(String(options?.body)));return geminiReply(requests.length===1?invalid:switchPlan());}) as typeof fetch;
  const result=await prepareAdventure(defaultSetup,"test-key","test-model",true);
  assert.equal(result.source,"ai");
  assert.ok(!puzzleTypes(requests[1].generationConfig.responseJsonSchema).includes("route"));
  assert.match(requests[1].contents[0].parts[0].text,/rooms\.2\.puzzle\.options\.0:/);
  assert.ok(!requests[1].contents[0].parts[0].text.includes("A".repeat(73)));
});

test("OpenAI response schema still allows route puzzles",async t=>{
  const plan=sample();
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  let request:any;
  globalThis.fetch=(async (_url,options)=>{request=JSON.parse(String(options?.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(plan)}}]}),{status:200});}) as typeof fetch;
  const result=await prepareAdventure(defaultSetup,"test-key","test-model",false);
  assert.equal(result.source,"ai");assert.ok(puzzleTypes(request.response_format.json_schema.schema).includes("route"));
});
