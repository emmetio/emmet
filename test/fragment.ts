import { describe, it } from "node:test";
import { strictEqual as equal } from "node:assert";
import expand, { UserConfig } from "../src";

describe("frag", () => {
    const config: UserConfig = { options: { "jsx.enabled": true } };

    it("should expand fragment", () => {
        // should it work without explicit jsx.enabled ? It's not a valid html tag afaik
        equal(expand("frag"), "<></>");
        // invalid result, adds one more fragment
        equal(expand("frag", config), "<></>");
    });

    it("should wrap any content with fragment", () => {
        equal(
            expand("frag", { ...config, text: "frag test" }),
            "<>frag test</>"
        );
    });

    it("should preserve formatting", () => {
        equal(
            expand("frag", {
                ...config,
                text: "test\n\ttext\twith\nsome\t\tformatting",
            }),
            "<>test\n\ttext\twith\nsome\t\tformatting</>"
        );
    });

    it("should wrap jsx with fragment", () => {
        equal(
            expand("frag", { ...config, text: "<span>foo</span>" }),
            "<><span>foo</span></>"
        );
        equal(
            expand("frag", { ...config, text: "foo<div>foo</div>" }),
            "<>foo<div>foo</div></>"
        );
    });

    it("should wrap fragment with fragment", () => {
        equal(
            expand("frag", { ...config, text: "<>nested</>" }),
            "<><>nested</></>"
        );
    });

    it("should wrap snippets with fragment", () => {
        // invalid result, adds one more fragment at start
        equal(
            expand("frag>ul>li*4", config),
            "<><ul>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n\t<li></li>\n</ul></>"
        );
    });
});
