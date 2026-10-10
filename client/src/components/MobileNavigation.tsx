import { useLocation } from "wouter";
import { Link } from "wouter";
import { Home, ClipboardCheck, MessageCircle, BookOpen, User } from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg rounded-t-xl md:hidden z-40">
      <div className="flex justify-around px-2 py-3">
        <Link href="/home">
          <div className={`flex flex-col items-center cursor-pointer ${location === '/home' ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </div>
        </Link>
        <Link href="/assessment/intro">
          <div className={`flex flex-col items-center cursor-pointer ${location.startsWith('/assessment') ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
            <ClipboardCheck className="w-5 h-5" />
            <span className="text-xs mt-1">Assessment</span>
          </div>
        </Link>
        <Link href="/chat">
          <div className={`flex flex-col items-center cursor-pointer ${location === '/chat' ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs mt-1">Chat</span>
          </div>
        </Link>
        <Link href="/resources">
          <div className={`flex flex-col items-center cursor-pointer ${location === '/resources' ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-xs mt-1">Resources</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`flex flex-col items-center cursor-pointer ${location === '/profile' ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}>
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
