import { AlertTriangle } from "lucide-react"
import { GradientBackground } from "@/components/ui/GradientBackground"

export function MaintenancePage() {
    return (
        <GradientBackground className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-lg">
                <div className="flex justify-center">
                    <AlertTriangle className="h-16 w-16 text-yellow-500" />
                </div>
                <h1 className="text-4xl font-bold tracking-tighter">Backend is down</h1>
                <p className="text-lg text-muted-foreground">
                    Oops...
                </p>
                <p className="text-sm text-muted-foreground">
                    The page will automatically refresh when services are back online.
                </p>
            </div>
        </GradientBackground>
    )
} 