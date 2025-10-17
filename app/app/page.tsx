'use client';

import { useMemo, useRef, useState } from "react";
import type { TrainingReport, Candidate } from "@/lib/model";
import { BigramLanguageModel } from "@/lib/model";

const defaultCorpus = `山河在晨光中醒来，薄雾缠绕着江水，仿佛诗句缓缓展开。
星光把夜的边缘镀上一层静谧，城市的灯火却仍旧围绕着梦想旋转。
在风声与树影之间，故事像潮水拍打心岸，放下昨日的疲惫，又拾起未知的希望。`;

const presetPrompts = [
  "城市的夜色",
  "清晨的微风",
  "梦想像",
  "在山谷之间",
];

export default function Home() {
  const [corpus, setCorpus] = useState(defaultCorpus);
  const [prompt, setPrompt] = useState(presetPrompts[0]);
  const [temperature, setTemperature] = useState(0.9);
  const [maxLength, setMaxLength] = useState(120);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [generation, setGeneration] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const modelRef = useRef<BigramLanguageModel | null>(null);

  const trainingSummary = useMemo(() => {
    if (!report) {
      return null;
    }

    const { vocabSize, transitionCount, sequenceCount } = report;
    return [
      { label: "词表规模", value: vocabSize.toString() },
      { label: "语料片段", value: sequenceCount.toString() },
      { label: "转移次数", value: transitionCount.toString() },
    ];
  }, [report]);

  const ensureModel = () => {
    const { model, report: details } = BigramLanguageModel.train(corpus, {
      preserveWhitespace: true,
      caseSensitive: false,
      smoothing: 0.4,
    });
    modelRef.current = model;
    setReport(details);
    setCandidates(
      model.topCandidates(prompt, 6, temperature).filter(
        (candidate) => candidate.token !== "\n",
      ),
    );
  };

  const handleTrain = () => {
    setIsBusy(true);
    setGeneration("");
    setTimeout(() => {
      ensureModel();
      setIsBusy(false);
    }, 10);
  };

  const handleGenerate = () => {
    setIsBusy(true);
    setTimeout(() => {
      if (!modelRef.current) {
        ensureModel();
      }

      const model = modelRef.current!;
      const text = model.generate({
        prompt,
        temperature,
        maxLength,
      });

      setGeneration(text);
      setCandidates(
        model.topCandidates(prompt, 6, temperature).filter(
          (candidate) => candidate.token !== "\n",
        ),
      );
      setIsBusy(false);
    }, 10);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-12 md:px-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">
          小型字符级语言模型实验室
        </h1>
        <p className="text-sm text-neutral-600 md:text-base dark:text-neutral-300">
          在浏览器中训练 Bigram 语言模型，探索温度、语料和提示语如何影响生成结果。
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">语料库</h2>
              <button
                type="button"
                className="rounded-full bg-neutral-900 px-3 py-1 text-sm text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200"
                onClick={() => {
                  setCorpus(defaultCorpus);
                  modelRef.current = null;
                  setReport(null);
                  setGeneration("");
                  setCandidates([]);
                }}
              >
                重置示例
              </button>
            </div>
            <textarea
              className="mt-4 h-48 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-800 shadow-inner focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              value={corpus}
              onChange={(event) => {
                setCorpus(event.target.value);
                modelRef.current = null;
                setReport(null);
              }}
              placeholder="粘贴或书写你的语料文本..."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              {presetPrompts.map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-4 py-1 text-sm transition ${
                    prompt === item
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                      : "bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                  type="button"
                  onClick={() => setPrompt(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
            <h2 className="text-xl font-medium">提示语与生成控制</h2>
            <label className="mt-4 flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <span>提示语</span>
              <input
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <span>
                  温度 <span className="font-mono text-neutral-500">{temperature.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={temperature}
                  onChange={(event) =>
                    setTemperature(Number.parseFloat(event.target.value))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <span>
                  最大生成字符{" "}
                  <span className="font-mono text-neutral-500">{maxLength}</span>
                </span>
                <input
                  type="range"
                  min={40}
                  max={280}
                  step={10}
                  value={maxLength}
                  onChange={(event) => setMaxLength(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTrain}
                disabled={isBusy}
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-500 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200"
              >
                {isBusy ? "训练中..." : "训练模型"}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isBusy}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:text-black disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 dark:border-neutral-600 dark:text-neutral-50 dark:hover:border-neutral-500 dark:hover:text-white"
              >
                生成文本
              </button>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="min-h-[180px] rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium">模型输出</h2>
              {generation && (
                <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  温度 {temperature.toFixed(2)}
                </span>
              )}
            </div>
            <div className="mt-4 min-h-[120px] whitespace-pre-wrap rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
              {generation || "生成区域将在模型创建文本之后展示。"}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">高概率候选</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                基于当前提示
              </span>
            </div>
            {candidates.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {candidates.map((candidate) => (
                  <li
                    key={candidate.token}
                    className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-1 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                  >
                    <span className="font-medium">
                      {candidate.token === " " ? "␠ 空格" : candidate.token}
                    </span>
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {(candidate.probability * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                先训练模型，然后即可查看提示语后最有可能出现的字符。
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
            <h2 className="text-xl font-medium">训练详情</h2>
            {trainingSummary ? (
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {trainingSummary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-neutral-100 px-3 py-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                输入语料并训练模型后，将展示词表规模、语料片段数量等信息。
              </p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
