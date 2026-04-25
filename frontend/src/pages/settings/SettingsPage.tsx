import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your application settings and configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/settings/measurement-unit" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Measurement Units
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm p-8 text-center text-muted-foreground">
        Select a configuration module from the top right to get started.
      </div>
    </div>
  );
}
