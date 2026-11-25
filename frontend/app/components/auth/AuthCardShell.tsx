interface AuthCardShellProps {
  children: React.ReactNode;
}

/** The centered white card that auth pages sit in. */
export default function AuthCardShell({ children }: AuthCardShellProps) {
  return (
    <div className="bg-off-white flex flex-1 items-center justify-center px-4 py-12">
      <div className="border-border-strong bg-surface relative w-full max-w-lg rounded-2xl border px-6 py-10 shadow-lg md:px-10">
        {children}
      </div>
    </div>
  );
}
