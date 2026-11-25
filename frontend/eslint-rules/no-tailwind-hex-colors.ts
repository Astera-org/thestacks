// Tailwind arbitrary-value syntax for a color, e.g. `bg-[#fff]`,
// `text-[#1a2b3c]`, `border-[#1a2b3c80]/50`. Matches 3/4/6/8-digit hex.
const HEX_COLOR_PATTERN =
  /-\[#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\](?:\/(?:\d{1,3}|\[[^\]]+\]))?/g;

function checkText(context: any, node: any, text: string): void {
  for (const match of text.matchAll(HEX_COLOR_PATTERN)) {
    context.report({
      node,
      messageId: "noHexColor",
      data: { match: match[0] }
    });
  }
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded hex colors in Tailwind arbitrary value classes (e.g. bg-[#RRGGBB]). Use a design token utility or CSS variable instead."
    },
    schema: [],
    messages: {
      noHexColor:
        "Do not hardcode hex colors in Tailwind classes ('{{match}}'). Use a design token utility (e.g. bg-carbon-900) or a CSS variable instead."
    }
  },
  create(context: any) {
    return {
      Literal(node: any) {
        if (typeof node.value === "string") {
          checkText(context, node, node.value);
        }
      },
      TemplateElement(node: any) {
        checkText(context, node, node.value.raw);
      }
    };
  }
};

export default rule;
