import { useLocation } from "wouter";
import { Link } from "wouter";
import { User } from "lucide-react";
import zengenLogo from "../assets/zengen_logo.png";

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white shadow-md fixed top-0 inset-x-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/home">
              <div className="flex-shrink-0 flex items-center cursor-pointer">
                <img src={zengenLogo} className="h-8 w-auto mr-2" alt="ZenGen Logo" />
                <span className="font-semibold text-xl text-primary-dark">ZenGen</span>
              </div>
            </Link>
          </div>
          <div className="hidden md:flex items-center">
            <div className="flex items-center space-x-4">
              <Link href="/home">
                <div className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${location === '/home' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
                  Home
                </div>
              </Link>
              <Link href="/assessment/intro">
                <div className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${location.startsWith('/assessment') ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
                  Assessment
                </div>
              </Link>
              <Link href="/chat">
                <div className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${location === '/chat' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
                  Chat
                </div>
              </Link>
              <Link href="/resources">
                <div className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${location === '/resources' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
                  Resources
                </div>
              </Link>
              <Link href="/profile">
                <div className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer flex items-center ${location === '/profile' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}>
                  <User className="w-4 h-4 mr-1" />
                  Profile
                </div>
              </Link>
              <Link href="/chat">
                <div className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full text-sm font-medium transition duration-150 ease-in-out cursor-pointer">
                  Get Help Now
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
