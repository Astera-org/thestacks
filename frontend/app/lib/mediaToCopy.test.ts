import { describe, expect, it } from "vitest";
import { countMediaToCopy } from "./mediaToCopy";

describe("countMediaToCopy", () => {
  it("counts Google Docs, Drive, and googleusercontent media in directives", () => {
    const body = [
      ':::image{src="https://drive.google.com/file/d/a/view" width="100%"}',
      ":::video{src='https://docs.google.com/b.mp4'}",
      ":::image{src=https://lh3.googleusercontent.com/c}"
    ].join("\n\n");
    expect(countMediaToCopy(body)).toBe(3);
  });

  it("ignores media hosted elsewhere", () => {
    const body = [
      ':::iframe{src="https://successteam.typeform.com/to/AR5B4r6L"}',
      ':::image{src="https://example.com/google.com.png"}',
      ':::image{src="not a url"}'
    ].join("\n\n");
    expect(countMediaToCopy(body)).toBe(0);
  });

  it("counts a repeated URL once but treats differing query strings as distinct", () => {
    const body = [
      ':::image{src="https://drive.google.com/file/d/a/view?usp=drive_link"}',
      ':::image{src="https://drive.google.com/file/d/a/view?usp=drive_link"}',
      ':::file{src="https://drive.google.com/file/d/a/view?usp=sharing"}'
    ].join("\n\n");
    expect(countMediaToCopy(body)).toBe(2);
  });

  it("ignores Google links outside directive attributes", () => {
    expect(
      countMediaToCopy(
        "See [the data](https://drive.google.com/file/d/a/view)."
      )
    ).toBe(0);
  });
});
