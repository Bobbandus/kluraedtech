import { parseQuestions } from "../src/lib/quiz-import.ts";

let fails = 0;
const check = (name: string, cond: boolean) => {
  if (!cond) {
    console.log("FEL:", name);
    fails++;
  }
};

const block = parseQuestions(`1. Vad är huvudstaden i Norge?
*Oslo
Bergen
Trondheim

2) Vilket år började andra världskriget?
- 1914
- *1939
- 1945
Förklaring: Tyskland anföll Polen 1 september 1939.

Fråga utan rätt svar
A
B

Bara en rad`);
check("två giltiga frågor", block.questions.length === 2);
check("numrering borttagen", block.questions[0].text === "Vad är huvudstaden i Norge?");
check("rätt svar först", block.questions[0].correct === 0);
check("rätt svar i mitten", block.questions[1].correct === 1 && block.questions[1].options[1] === "1939");
check("förklaring", block.questions[1].explanation?.startsWith("Tyskland") === true);
check("två fel", block.errors.length === 2);

const tab = parseQuestions("Fråga\tRätt\tFel\tFel\nHur många ben har en spindel?\tÅtta\tSex\tTio\nVad är H2O?;Vatten;Salt;Socker");
check("kalkylark: två frågor", tab.questions.length === 2);
check("kalkylark: rätt svar först", tab.questions[0].options[0] === "Åtta" && tab.questions[0].correct === 0);

const star = parseQuestions("Vilken färg har himlen?\nGrön\nBlå *\nRöd");
check("stjärna efter svaret", star.questions[0]?.correct === 1);

console.log(fails ? `${fails} fel` : "Alla importtester gick igenom");
process.exit(fails ? 1 : 0);
