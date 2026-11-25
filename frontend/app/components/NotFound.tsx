import Button from "@/components/stacks-ui/Button";
import useAppNavigate from "@/hooks/useAppNavigate";

export default function NotFound() {
  const navigate = useAppNavigate();
  return (
    <div className="max-w-container mx-auto flex w-full flex-1 flex-col items-center justify-center px-6 text-center">
      {/* 404.*/}
      <div className="relative mb-8">
        <h1 className="text-fg-muted relative font-mono text-[120px] leading-none font-light tracking-tighter md:text-[180px]">
          404
        </h1>
      </div>

      {/* Message. */}
      <h2 className="text-fg-muted mb-3 font-serif text-2xl md:text-3xl">
        Page not found
      </h2>
      <p className="text-fg-subtle mb-8 max-w-md font-sans text-base font-light md:text-lg">
        The page you're looking for doesn't exist or may have been moved to a
        different location.
      </p>

      {/* Back to home button. */}
      <Button
        className="hover:bg-peach-900/80 w-fit px-4 py-2 text-sm md:text-base"
        onClick={() => navigate("/")}
      >
        Back to home
      </Button>
    </div>
  );
}
