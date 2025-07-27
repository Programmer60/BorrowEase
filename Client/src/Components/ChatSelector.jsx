import { useParams, useNavigate } from "react-router-dom";
import { MessageCircle, Zap, Users, Settings } from "lucide-react";

export default function ChatSelector() {
  const { loanId } = useParams();
  const navigate = useNavigate();

  const chatOptions = [
    {
      title: "Simple Chat",
      description: "Basic chat with HTTP polling (3-second refresh)",
      icon: MessageCircle,
      route: `/chat/${loanId}`,
      features: ["Message history", "Auto-refresh", "Basic UI"],
      color: "bg-blue-500"
    },
    {
      title: "Real-Time Chat",
      description: "Socket.IO powered real-time messaging",
      icon: Zap,
      route: `/chat-realtime/${loanId}`,
      features: ["Instant messaging", "Typing indicators", "Connection status"],
      color: "bg-green-500"
    },
    {
      title: "Enhanced Chat",
      description: "Full-featured chat with advanced UI and features",
      icon: Users,
      route: `/chat-enhanced/${loanId}`,
      features: ["Read receipts", "Emoji picker", "Online status", "Message grouping"],
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Chat Experience
          </h1>
          <p className="text-gray-600">
            Select the chat interface that best suits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {chatOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(option.route)}
              >
                <div className={`${option.color} px-6 py-4`}>
                  <div className="flex items-center text-white">
                    <Icon className="w-8 h-8 mr-3" />
                    <h3 className="text-xl font-semibold">{option.title}</h3>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{option.description}</p>
                  
                  <h4 className="font-semibold text-gray-900 mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {option.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button className={`w-full mt-6 ${option.color} text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity`}>
                    Use This Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 flex items-center mx-auto"
          >
            ← Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
