import { AlertTriangle } from "lucide-react"

export function MaintenancePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background/95 to-background/90 px-4">
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
        </div>
    )
} 