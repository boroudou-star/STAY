import { describe, expect, it } from "vitest";
import { AREA_EXPERTS, CONCEPTS } from "@/data/insight-expert";
import { INSIGHT_AREAS } from "@/data/insights";
import type { ChatTurn, ExpertTopic } from "@/lib/types";
import { assessAnswer, conceptOf, expertOpener, expertReply, expertSummary, userAnswerText } from "./expert";

const REG: ExpertTopic = { kind: "concept", question: 'Explain "AI regulation" (AI & machine learning) as if to a friend, and say why it matters to employers.', area: "ai", concept: "AI regulation" };
const NEWS: ExpertTopic = {
  kind: "news",
  question: '"Monzo launches mortgages": what does this mean for Monzo?',
  area: "finance-markets",
  company: "Monzo",
  item: { title: "Monzo launches mortgages for first-time buyers", source: "BBC", kind: "news" },
};
const PRAISE = /\b(great|good start|well done|excellent|nice|strong reflection|good answer)\b/i;

function chat(topic: ExpertTopic, answers: string[]) {
  const turns: ChatTurn[] = [{ role: "expert", text: expertOpener(topic) }];
  for (const a of answers) {
    turns.push({ role: "user", text: a });
    turns.push({ role: "expert", text: expertReply(topic, turns) });
  }
  return turns;
}
const expertTurns = (t: ChatTurn[]) => t.filter((x) => x.role === "expert").map((x) => x.text);

describe("expert knowledge", () => {
  it("has knowledge for every key concept and a persona for every area", () => {
    for (const a of INSIGHT_AREAS) {
      expect(AREA_EXPERTS[a.id]).toBeTruthy();
      for (const k of a.keyConcepts) expect(CONCEPTS.some((c) => c.concept === k), k).toBe(true);
    }
  });
  it("never uses dashes as punctuation", () => {
    const all = JSON.stringify([CONCEPTS, AREA_EXPERTS]);
    expect(all).not.toMatch(/[—–]| - /);
  });
});

describe("reading answers honestly", () => {
  it("spots the answers the old checklist praised", () => {
    expect(assessAnswer("you asked the same question", REG).kind).toBe("meta");
    expect(assessAnswer("ChatGPT, Claude, Gemini, AlphaFold", REG).kind).toBe("list");
    expect(assessAnswer("idk", REG).kind).toBe("unsure");
    expect(assessAnswer("ok", REG).kind).toBe("low");
    expect(assessAnswer("I like going to the gym and playing football with friends on weekends", REG).kind).toBe("off");
    expect(assessAnswer("Rules governments set on how AI is used, because hiring algorithms can be biased", REG).kind).toBe("ok");
  });
});

describe("the expert discussion", () => {
  it("does not praise or move on from bad answers, and corrects a list of products", () => {
    const t = chat(REG, ["ChatGPT, Claude, Gemini, AlphaFold"]);
    const reply = expertTurns(t)[1];
    expect(reply).toMatch(/list/i);
    expect(reply).toMatch(/rules governments put on how AI is built/);
    expect(reply).toMatch(/Pick one, say ChatGPT, and tell me what it has to do with AI regulation/);
    expect(reply).not.toMatch(PRAISE);
  });

  it("changes approach when told it's repeating itself, and never repeats a question", () => {
    const t = chat(NEWS, ["you asked the same question", "you asked the same question", "you asked the same question"]);
    const replies = expertTurns(t);
    for (const r of replies.slice(1)) expect(r).not.toMatch(PRAISE);
    expect(replies[1]).toMatch(/differently/);
    expect(new Set(replies).size).toBe(replies.length);
  });

  it("teaches when the student is stuck, then asks an easier question", () => {
    const t = chat(REG, ["I'm not sure"]);
    const reply = expertTurns(t)[1];
    expect(reply).toMatch(/AI regulation is the set of rules/);
    expect(reply).toMatch(/Now you try/);
  });

  it("builds on a real answer: quotes it, adds context and goes one level deeper", () => {
    const t = chat(REG, ["It's rules governments set on AI so it isn't used in harmful ways, because hiring algorithms can be biased"]);
    const reply = expertTurns(t)[1];
    expect(reply).toContain('"It\'s rules governments set on AI');
    expect(reply).toMatch(/example/i);
    const t2 = chat(REG, [
      "It's rules governments set on AI so it isn't used in harmful ways, because hiring algorithms can be biased",
      "For example banks using AI for loans must explain decisions to customers and regulators",
    ]);
    expect(expertTurns(t2)[2]).toMatch(/prove before using it/);
  });

  it("asks for a side when a view-stage answer dodges the question", () => {
    const t = chat(NEWS, [
      "Monzo now offers mortgages to first-time buyers, which puts it up against banks like Barclays",
      "Rates have fallen and Monzo has millions of customers, so it can cross-sell because it already has their data",
      "There are lots of banks offering mortgages",
    ]);
    expect(expertTurns(t)[3]).toMatch(/can't tell|still abstract/);
  });

  it("wraps up honestly: weak answers are called weak", () => {
    const t = chat(REG, ["ChatGPT, Claude, Gemini, AlphaFold", "you asked the same question", "idk"]);
    const s = expertSummary(REG, t);
    expect(s.verdict).toBe("weak");
    expect(s.strengths).toHaveLength(0);
    expect(s.corrections.join(" ")).toMatch(/list of names/);
    expect(s.interviewAnswer).toMatch(/\[Add:/);
    expect(s.headline).not.toMatch(PRAISE);
  });

  it("recognises a genuinely good discussion", () => {
    const t = chat(REG, [
      "It's rules governments set on AI so it isn't used in harmful ways, because hiring or lending algorithms can be biased against people",
      "For example the EU AI Act treats hiring and credit scoring as high risk, so a bank using AI for loans must explain its decisions",
      "A company should prove the model was tested for bias on real applicants, because a benchmark score says nothing about fairness for minorities",
      "I think clear rules speed up adoption, because banks and hospitals won't deploy AI they can't defend to a regulator",
      "Startups would say compliance costs favour big tech, which is fair, but sandboxes and lighter rules for low-risk uses reduce that",
      "It matters to a bank because every AI product it launches needs sign off from risk and compliance, so analysts who understand the rules ship faster",
    ]);
    const s = expertSummary(REG, t);
    expect(s.verdict).toBe("strong");
    expect(s.strengths.length).toBeGreaterThan(0);
    expect(s.interviewAnswer).not.toMatch(/\[Add:/);
    expect(userAnswerText(REG, t)).toContain("EU AI Act");
  });

  it("starts deeper when reading notes already summarise the story", () => {
    const opener = expertOpener({ ...NEWS, notes: { summary: "Monzo will offer mortgages to first-time buyers from next month through its app" } });
    expect(opener).toMatch(/read your notes/);
    expect(opener).toMatch(/Why is this happening now/);
  });

  it("only borrows a concept for a primer when the primer is clearly about it", () => {
    const primer: ExpertTopic = {
      kind: "primer",
      question: "How could regulation create new jobs in AI rather than reduce them?",
      area: "ai",
      primer: { title: "Regulation and trust", body: "Governments are setting rules for how AI is built and used, covering transparency, high-risk uses, copyright and safety testing." },
    };
    expect(conceptOf(primer)?.concept).toBe("AI regulation");
  });
});
