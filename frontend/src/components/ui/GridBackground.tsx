import { cn } from "@/lib/utils";

interface GridBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function GridBackground({ children, className, ...props }: GridBackgroundProps) {
    return (
        <div className={cn("relative w-full", className)} {...props}>
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>
            {children}
        </div>
    );
} 