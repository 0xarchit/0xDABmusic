import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
}

export function Loader({ className, size = "md", message }: LoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6",
        className
      )}
    >
      <div className="relative">
        <div className={cn("relative", sizeClasses[size])}>
          <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>

          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-green-500 animate-spin"></div>

          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-purple-500 animate-spin animate-reverse animate-duration-1500"></div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-linear-to-r from-green-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="absolute -inset-4 bg-linear-to-r from-green-500/20 via-purple-500/20 to-green-500/20 rounded-full blur-xl animate-pulse"></div>
      </div>

      {message && (
        <div className="text-center">
          <p className="text-white/90 font-medium animate-pulse">{message}</p>
          <div className="flex gap-1 justify-center mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animate-delay-0"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animate-delay-150"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animate-delay-300"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FullPageLoader({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animate-delay-1000"></div>
      </div>

      <div className="relative">
        <Loader size="xl" message={message} />
      </div>
    </div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader size="md" message={message} />
    </div>
  );
}
