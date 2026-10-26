import { Phone, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function EmergencyResources() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base">Need to talk to someone right now?</h3>
            <p className="text-sm text-muted-foreground">
              If you are in crisis, free confidential support is available 24/7.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground mt-2">
              <span><strong>988 Lifeline:</strong> Call/Text 988</span>
              <span><strong>Crisis Text Line:</strong> Text HOME to 741741</span>
              <span><strong>Emergency:</strong> 911</span>
            </div>
          </div>
        </div>
        <Link href="/crisis">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/15">
            Full Crisis Guide <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
