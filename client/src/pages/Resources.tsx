import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Book, FileText, Video, Search, ExternalLink, Sparkles, Filter, X, Play } from "lucide-react";
import EmergencyResources from "@/components/EmergencyResources";
import { useQuery } from "@tanstack/react-query";

interface Resource {
  id: number;
  title: string;
  description: string;
  type: "article" | "video" | "guide";
  icon: "book" | "video" | "file-text";
  duration: string;
  tags: string[];
  url: string;
}

const POPULAR_TOPICS = [
  "All",
  "Anxiety",
  "Stress Management",
  "Depression",
  "Sleep",
  "Mindfulness",
  "School",
  "Self-Care",
];

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [activeTab, setActiveTab] = useState<"all" | "newest" | "videos" | "articles">("all");

  const { data: resources = [], isLoading, error } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    queryFn: async () => {
      const res = await fetch('/api/resources');
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
  });

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let result = [...resources];

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Topic filter
    if (selectedTopic !== "All") {
      result = result.filter((r) =>
        r.tags?.some((t) => t.toLowerCase() === selectedTopic.toLowerCase())
      );
    }

    // Tab filter
    if (activeTab === "videos") {
      result = result.filter((r) => r.type === "video");
    } else if (activeTab === "articles") {
      result = result.filter((r) => r.type === "article" || r.type === "guide");
    } else if (activeTab === "newest") {
      // Sort newest by higher ID first
      result = [...result].sort((a, b) => b.id - a.id);
    }

    return result;
  }, [resources, searchQuery, selectedTopic, activeTab]);

  const getSourceFromUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes("nimh.nih.gov")) return "NIMH (NIH)";
      if (hostname.includes("mayoclinic.org")) return "Mayo Clinic";
      if (hostname.includes("childmind.org")) return "Child Mind Institute";
      if (hostname.includes("sleepfoundation.org")) return "Sleep Foundation";
      if (hostname.includes("mhanational.org")) return "Mental Health America";
      if (hostname.includes("hopkinsmedicine.org")) return "Johns Hopkins";
      if (hostname.includes("health.harvard.edu")) return "Harvard Health";
      if (hostname.includes("youtube.com")) return "YouTube Verified";
      return hostname.replace("www.", "");
    } catch {
      return "Medical Source";
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-rose-500" />;
      case "article":
        return <Book className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-cyan-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mental Wellness Resource Library</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Verified educational articles, guided relaxation videos, and evidence-based mental health toolkits from renowned health organizations.
        </p>
      </div>

      {/* Search and Tabs Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by topic, keyword, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 bg-card text-sm rounded-xl border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Section Tabs */}
          <div className="flex bg-muted/60 p-1 rounded-xl self-start sm:self-auto shrink-0 border border-border">
            {[
              { id: "all", label: "All Resources" },
              { id: "newest", label: "New Resources" },
              { id: "articles", label: "Articles & Guides" },
              { id: "videos", label: "Videos" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Topics Chips */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Popular Topics:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedTopic === topic
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-48 border border-border bg-card">
              <CardContent className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-12 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border border-border text-center p-8">
          <CardContent className="space-y-2">
            <p className="text-sm font-semibold text-destructive">Failed to load resources.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredResources.length === 0 ? (
        <Card className="border border-border text-center p-12 bg-card">
          <CardContent className="space-y-3">
            <Book className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">No resources found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No articles or videos match your current search terms or topic filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedTopic("All");
                setActiveTab("all");
              }}
              className="text-xs mt-2"
            >
              Reset All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const isVideo = res.type === "video";
            const sourceName = getSourceFromUrl(res.url);

            return (
              <Card
                key={res.id}
                className="border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Top Row: Type and Source Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/40 text-foreground border border-border/60">
                        {getIconForType(res.type)}
                        <span className="capitalize">{res.type}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">
                        {sourceName}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                      {res.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {res.description}
                    </p>

                    {/* Topic Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row: Duration and Open Link Action */}
                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">{res.duration}</span>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-bold hover:underline"
                    >
                      {isVideo ? (
                        <>
                          <Play className="h-3 w-3 fill-current" /> Watch Video
                        </>
                      ) : (
                        <>
                          Read Article <ExternalLink className="h-3 w-3" />
                        </>
                      )}
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Emergency Assistance Footer Banner */}
      <EmergencyResources />
    </div>
  );
}
