import { Phone } from "lucide-react";

export default function EmergencyResources() {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-destructive mr-3 mt-1">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-gray-800">Need to talk to someone right now?</h3>
          <p className="text-sm text-gray-600 mb-2">If you're in crisis or need immediate support, help is available 24/7.</p>
          <div className="space-y-1 text-sm">
            <div><strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988</div>
            <div><strong>Crisis Text Line:</strong> Text HOME to 741741</div>
            <div><strong>Emergency Services:</strong> Call 911</div>
          </div>
        </div>
      </div>
    </div>
  );
}
