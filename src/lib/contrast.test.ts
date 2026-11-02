import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`));
  if (!match) throw new Error(`Missing token ${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(token(foreground)), luminance(token(background))].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

// Every text/background pair the storefront uses. Add new pairs here.
const normalText = [
  ["ink", "blush"],
  ["ink", "blush-deep"],
  ["ink", "white"],
  ["ink", "rose"],
  ["ink", "gold"],
  ["muted", "blush"],
  ["muted", "blush-deep"],
  ["muted", "white"],
  ["white", "ink"],
];
// Script tagline only, always 24px or larger.
const largeText = [
  ["rose-dark", "blush"],
  ["rose-dark", "blush-deep"],
];
// Icons, which need 3:1 (WCAG 1.4.11).
const icons = [
  ["rose-dark", "white"],
  ["rose-dark", "blush"],
  ["rose-dark", "blush-deep"],
  ["gold-dark", "white"],
  ["white", "rose-dark"],
];

describe("WCAG AA contrast", () => {
  it.each(normalText)("%s on %s is at least 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([...largeText, ...icons])("%s on %s is at least 3:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  it("documents the pairs to avoid for small text", () => {
    expect(contrast("white", "rose-dark")).toBeLessThan(4.5);
    expect(contrast("white", "rose")).toBeLessThan(4.5);
    expect(contrast("rose-dark", "white")).toBeLessThan(4.5);
    expect(contrast("gold-dark", "blush")).toBeLessThan(4.5);
  });
});
