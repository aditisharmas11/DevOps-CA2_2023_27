import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, Heart, Book, FileText, Video } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import { useQuery } from "@tanstack/react-query";

type Resource = {
  id: number;
  title: string;
  description: string;
  type: "article" | "video" | "guide";
  icon: "book" | "video" | "file-text";
  duration: string;
  tags: string[];
  url: string;
};

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['/api/resources'],
    queryFn: async () => {
      const response = await fetch('/api/resources');
      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }
      return response.json();
    },
  });

  // Filter resources based on search query and selected tag
  const filteredResources = resources.filter((resource: Resource) => {
    const matchesSearch = searchQuery === "" ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = selectedTag === null || resource.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const popularTags = [
    "Anxiety", "Depression", "Stress Management", "Sleep",
    "Self-Care", "Social Anxiety", "Mindfulness"
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mental Health Resources</h2>

          <div className="mb-6">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search resources..."
                className="w-full pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-medium text-gray-800 mb-3">Popular Topics</h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => handleTagClick(tag)}
                  className={`inline-block px-3 py-1 rounded-full text-sm transition-colors duration-200 
                    ${selectedTag === tag
                      ? 'bg-primary text-white'
                      : 'bg-blue-100 text-primary hover:bg-blue-200'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Resources */}
          <div className="mb-8">
            <h3 className="font-medium text-gray-800 mb-3">Featured Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-32 bg-primary-light flex items-center justify-center">
                  <Brain className="h-12 w-12 text-white" />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-800 mb-1">Teen Stress Survival Guide</h4>
                  <p className="text-sm text-gray-600 mb-3">Learn practical techniques to manage school stress and social pressures.</p>
                  <a href="#" className="text-primary text-sm font-medium hover:underline">Read article →</a>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="h-32 bg-secondary-light flex items-center justify-center">
                  <Heart className="h-12 w-12 text-white" />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-800 mb-1">5-Minute Calm: Audio Guide</h4>
                  <p className="text-sm text-gray-600 mb-3">Quick guided meditation exercises you can do anywhere.</p>
                  <a href="#" className="text-primary text-sm font-medium hover:underline">Listen now →</a>
                </div>
              </div>
            </div>
          </div>

          {/* Resources List */}
          <div>
            <h3 className="font-medium text-gray-800 mb-3">All Resources</h3>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Book className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No resources found matching your criteria.</p>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-primary mt-2 hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResources.map((resource: Resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors duration-150 cursor-pointer"
                  >hover:border-primary transition-colors duration-150"
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2 mr-3">
                        {resource.icon === "book" && <Book className="h-5 w-5 text-primary" />}
                        {resource.icon === "video" && <Video className="h-5 w-5 text-primary" />}
                        {resource.icon === "file-text" && <FileText className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{resource.title}</h4>
                        <p className="text-sm text-gray-600 mb-1">{resource.description}</p>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-3">{resource.duration}</span>
                          <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded capitalize">{resource.type}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {filteredResources.length > 5 && (
              <div className="mt-4 text-center">
                <button className="text-primary hover:text-primary-dark font-medium inline-flex items-center">
                  View more resources
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EmergencyResources />
    </div>
  );
}
