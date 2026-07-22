"use client";

import { useState } from "react";

import { TimeSeriesChart, type TimeSeriesPoint } from "@/components/training-os";

import styles from "./page.module.css";

const range = (center: number, lower: number, upper: number, robustZScore: number, status: "within" | "above" | "below") => ({
  center,
  lower,
  upper,
  sampleCount: 28,
  robustZScore,
  status,
});

const hrv: TimeSeriesPoint[] = [
  { date: "2026-07-15", value: 88, personalRange: range(84, 61, 107, .2, "within") },
  { date: "2026-07-16", value: 88, personalRange: range(84, 61, 107, .2, "within") },
  { date: "2026-07-17", value: 67, personalRange: range(84, 61, 107, -.9, "within") },
  { date: "2026-07-18", value: 61, personalRange: range(83, 60, 106, -1.1, "within") },
  { date: "2026-07-19", value: 23, personalRange: range(82, 59, 105, -3.99, "below") },
  { date: "2026-07-20", value: 18, personalRange: range(80, 57, 103, -4.48, "below") },
  { date: "2026-07-21", value: 87, personalRange: range(77, 51, 103, .5, "within") },
];

const restingHeartRate: TimeSeriesPoint[] = [
  { date: "2026-07-15", value: 50, personalRange: range(52, 44, 60, -.5, "within") },
  { date: "2026-07-16", value: 46, personalRange: range(52, 44, 60, -1.3, "within") },
  { date: "2026-07-17", value: 55, personalRange: range(52, 44, 60, .8, "within") },
  { date: "2026-07-18", value: 58, personalRange: range(52, 44, 60, 1.4, "within") },
  { date: "2026-07-19", value: 76, personalRange: range(52, 44, 60, 5.85, "above") },
  { date: "2026-07-20", value: 85, personalRange: range(53, 45, 61, 7.64, "above") },
  { date: "2026-07-21", value: 61, personalRange: range(54, 46, 62, 1.7, "within") },
];

const events = [
  { id: "alcohol-17", date: "2026-07-17", label: "Alcohol", type: "alcohol" },
  { id: "alcohol-18", date: "2026-07-18", label: "Alcohol", type: "alcohol" },
  { id: "alcohol-19", date: "2026-07-19", label: "Alcohol", type: "alcohol" },
  { id: "illness-20", date: "2026-07-20", label: "Illness", type: "illness" },
];

export default function ChartSystemLabPage() {
  const [activeDate, setActiveDate] = useState("2026-07-21");
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const pinDate = (date: string | null) => { setPinnedDate(date); if (date) setActiveDate(date); };
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Chart system verification</h1>
        <p>Deterministic fixtures for point density, personal-range breaches, recorded events, and responsive rendering.</p>
      </header>
      <section className={styles.grid} aria-label="Chart fixtures">
        <article className={styles.fixture}>
          <header><div><h2>HRV</h2><p>Week · all observations visible</p></div><strong>87ms</strong></header>
          <TimeSeriesChart metric="hrv" label="HRV trend" unit="ms" points={hrv} baseline={84} range="week" presentation="area-line" events={events} showEvents activeDate={activeDate} pinnedDate={pinnedDate} onActiveDateChange={setActiveDate} onPinnedDateChange={pinDate} />
        </article>
        <article className={styles.fixture}>
          <header><div><h2>Resting HR</h2><p>Range corridor and upper breaches</p></div><strong>61bpm</strong></header>
          <TimeSeriesChart metric="restingHeartRate" label="Resting HR trend" unit="bpm" points={restingHeartRate} baseline={52} range="week" events={events} showEvents activeDate={activeDate} pinnedDate={pinnedDate} onActiveDateChange={setActiveDate} onPinnedDateChange={pinDate} />
        </article>
        <article className={`${styles.fixture} ${styles.empty}`}>
          <header><div><h2>Skin temperature</h2><p>Explicit empty observation state</p></div><strong>—</strong></header>
          <div role="status">No recorded observations in this range</div>
        </article>
        <article className={`${styles.fixture} ${styles.source}`}>
          <header><div><h2>Alcohol log</h2><p>WHOOP journal coverage through Jul 20</p></div><strong>3 entries</strong></header>
          <ol aria-label="Recorded alcohol dates"><li>Jul 17</li><li>Jul 18</li><li>Jul 19</li></ol>
          <p>Recorded journal events are shown separately from physiological deviations and do not establish a cause.</p>
          <dl className={styles.coverageStates} aria-label="Alcohol source states">
            <div><dt>Missing export</dt><dd>WHOOP journal export required</dd></div>
            <div><dt>Incomplete coverage</dt><dd>Journal data through Jul 20</dd></div>
            <div><dt>Covered zero</dt><dd>No recorded alcohol in this range</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
