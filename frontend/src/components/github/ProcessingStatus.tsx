import { UserJob } from "@/types/github";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  jobStatus: UserJob | null;
  isRefreshing: boolean;
}

export function ProcessingStatus({ jobStatus, isRefreshing }: ProcessingStatusProps) {
  const progressPercentage = jobStatus && jobStatus.total_repos > 0
    ? (jobStatus.processed_repos / jobStatus.total_repos) * 100
    : 0;

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
      <div className="flex items-center justify-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <h3 className="text-lg font-medium">
          {isRefreshing ? "Refreshing" : "Processing"} your starred repositories
        </h3>
      </div>
      
      {jobStatus && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status: {jobStatus.status}</span>
            <span>{jobStatus.processed_repos} of {jobStatus.total_repos} repositories processed</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-2">
            This may take some time depending on how many stars you have.
          </p>
        </div>
      )}
    </div>
  );
} 