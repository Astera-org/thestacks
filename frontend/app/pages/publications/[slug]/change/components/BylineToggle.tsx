import Switch from "@/components/stacks-ui/Switch";

export default function BylineToggle({
  contributorName,
  disabled,
  on,
  onChange,
}: {
  contributorName: string;
  disabled?: boolean;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="text-caption-20 text-fg inline-flex cursor-pointer items-center gap-2 font-mono has-disabled:cursor-not-allowed">
      <Switch
        aria-label={`Show ${contributorName} in the byline`}
        checked={on}
        className="data-[state=checked]:bg-mint-green-900"
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <span aria-hidden className="w-6">
        {on ? "Yes" : "No"}
      </span>
    </label>
  );
}
