import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { calendarAPI, tvShowsAPI } from "../services/api";
import { Episode } from "../types/episode";
import { endOfDay, format, startOfToday, subDays, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Check, X, Table2, Grid3x3, Loader2 } from "lucide-react";
import EpisodeCard from "../components/EpisodeCard";
import { useTimezone } from "@/shared/hooks/useTimezone";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type ViewMode = "table" | "cards";

function RecentlyAired() {
  const { getDateKey, formatInTimezone: fmtTz } = useTimezone();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hideArchived, setHideArchived] = useState(false);
  const [hideWatched, setHideWatched] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [daysToShow, setDaysToShow] = useState(7);

  useEffect(() => {
    loadEpisodes();
  }, [hideArchived, daysToShow]);

  const loadEpisodes = async () => {
    try {
      if (episodes.length > 0) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const today = startOfToday();
      const startDate = subDays(today, daysToShow);
      const endDate = endOfDay(today);

      const response = await calendarAPI.getEpisodes(
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd"),
        hideArchived
      );

      const allEpisodes: Episode[] = response.episodes || [];
      const todayKey = fmtTz(new Date(), "yyyy-MM-dd");

      const pastEpisodes = allEpisodes.filter((ep) => {
        if (!ep.air_date) return false;
        const key = getDateKey(ep.air_date);
        return key <= todayKey;
      });

      pastEpisodes.sort((a, b) => {
        if (!a.air_date || !b.air_date) return 0;
        const keyA = getDateKey(a.air_date);
        const keyB = getDateKey(b.air_date);
        if (keyA !== keyB) return keyB.localeCompare(keyA);
        const titleCmp = (a.tv_show_title || "").localeCompare(
          b.tv_show_title || ""
        );
        if (titleCmp !== 0) return titleCmp;
        if (a.season_number !== b.season_number)
          return a.season_number - b.season_number;
        return a.episode_number - b.episode_number;
      });

      setEpisodes(pastEpisodes);
    } catch (error) {
      console.error("Error loading recently aired episodes:", error);
      toast.error("Failed to load recently aired episodes");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleUpdate = () => {
    loadEpisodes();
  };

  const handleMarkWatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeWatched(episode.tv_show_id, episode.id);
      toast.success("Episode marked as watched");
      handleUpdate();
    } catch (error) {
      console.error("Error marking episode as watched:", error);
      toast.error("Failed to mark episode as watched");
    }
  };

  const handleMarkUnwatched = async (episode: Episode) => {
    try {
      await tvShowsAPI.markEpisodeUnwatched(episode.tv_show_id, episode.id);
      toast.success("Episode marked as unwatched");
      handleUpdate();
    } catch (error) {
      console.error("Error marking episode as unwatched:", error);
      toast.error("Failed to mark episode as unwatched");
    }
  };

  const filteredEpisodes = useMemo(
    () =>
      hideWatched ? episodes.filter((ep) => ep.is_watched !== 1) : episodes,
    [episodes, hideWatched]
  );

  const todayKey = fmtTz(new Date(), "yyyy-MM-dd");
  const todayDate = new Date(todayKey + "T12:00:00.000Z");

  function getDaysAgoLabel(dayKey: string): string {
    const dayDate = new Date(dayKey + "T12:00:00.000Z");
    const days = differenceInDays(todayDate, dayDate);
    if (days === 0) return " (Today)";
    if (days === 1) return " (1 day ago)";
    return ` (${days} days ago)`;
  }

  const episodesByDay = useMemo(() => {
    const map: Record<string, Episode[]> = {};
    for (const ep of filteredEpisodes) {
      const key = getDateKey(ep.air_date);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ep);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const titleCmp = (a.tv_show_title || "").localeCompare(
          b.tv_show_title || ""
        );
        if (titleCmp !== 0) return titleCmp;
        if (a.season_number !== b.season_number)
          return a.season_number - b.season_number;
        return a.episode_number - b.episode_number;
      });
    }
    return map;
  }, [filteredEpisodes, getDateKey]);

  const dayKeysWithEpisodes = useMemo(() => {
    return Object.keys(episodesByDay)
      .filter((key) => episodesByDay[key].length > 0)
      .sort((a, b) => b.localeCompare(a));
  }, [episodesByDay]);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Recently Aired</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Episodes from the past {daysToShow} days
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex border border-border rounded overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-accent"
                }`}
              >
                <Table2 className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-4 py-2 text-sm font-medium border-l border-border transition-colors flex items-center gap-2 ${
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-accent"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Cards
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideArchived}
                onChange={(e) => setHideArchived(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Hide archived</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideWatched}
                onChange={(e) => setHideWatched(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Hide watched</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
            <div className="text-lg text-muted-foreground">
              Loading recently aired episodes...
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {dayKeysWithEpisodes.length === 0 ? (
              <div className="flex justify-center items-center py-[60px] px-5 bg-card rounded-lg">
                <div className="text-lg text-muted-foreground">
                  {episodes.length === 0
                    ? `No episodes aired in the past ${daysToShow} days`
                    : "No episodes match the current filters"}
                </div>
              </div>
            ) : (
              dayKeysWithEpisodes.map((dayKey) => {
                const dayEpisodes = episodesByDay[dayKey] || [];
                const dayDate = new Date(dayKey + "T12:00:00.000Z");
                const dayLabel = fmtTz(dayDate, "MMMM d, yyyy");
                const weekdayLabel = fmtTz(dayDate, "EEEE");
                const isToday = dayKey === todayKey;

                return (
                  <section key={dayKey}>
                    <h2
                      className={`text-lg font-semibold mb-3 ${
                        isToday ? "text-primary" : ""
                      }`}
                    >
                      {dayLabel} — {weekdayLabel}
                      {getDaysAgoLabel(dayKey)}
                    </h2>

                    <p className="text-muted-foreground text-sm mb-2">
                      {dayEpisodes.length === 1
                        ? "1 episode"
                        : `${dayEpisodes.length} episodes`}
                    </p>

                    {viewMode === "table" ? (
                      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <div
                            role="table"
                            className="grid w-full border-collapse"
                            style={{
                              gridTemplateColumns:
                                "minmax(64px, 80px) minmax(140px, 2fr) 0.75fr minmax(140px, 2fr) 0.6fr minmax(80px, 1fr) minmax(100px, 1fr)",
                            }}
                          >
                            <div className="contents" role="row">
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Image
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                TV Show
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Episode
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Name
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Runtime
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Status
                              </div>
                              <div
                                role="columnheader"
                                className="p-3 text-left border-b border-border text-sm font-semibold bg-muted"
                              >
                                Actions
                              </div>
                            </div>
                            {dayEpisodes.map((episode) => {
                              const isWatched = episode.is_watched === 1;
                              const imageUrl = episode.still_path
                                ? `${TMDB_IMAGE_BASE}/w92${episode.still_path}`
                                : episode.tv_show_poster
                                  ? `${TMDB_IMAGE_BASE}/w92${episode.tv_show_poster}`
                                  : null;
                              return (
                                <div
                                  key={episode.id}
                                  className={`contents group ${
                                    isWatched ? "opacity-60" : ""
                                  }`}
                                  role="row"
                                >
                                  <div
                                    role="cell"
                                    className="p-3 border-b border-border group-hover:bg-accent transition-colors flex items-center"
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={episode.name || "Episode"}
                                        className="w-14 aspect-video object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-14 aspect-video rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                        No image
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 text-sm border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    <Link
                                      to={`/media/tv-shows/${episode.tv_show_id}`}
                                      className="font-medium text-primary text-left hover:underline"
                                    >
                                      {episode.tv_show_title || "Unknown Show"}
                                    </Link>
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 text-sm text-muted-foreground border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    S
                                    {episode.season_number
                                      .toString()
                                      .padStart(2, "0")}
                                    E
                                    {episode.episode_number
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 text-sm font-medium border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    {episode.name || "Untitled Episode"}
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 text-sm text-muted-foreground border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    {episode.runtime
                                      ? `${episode.runtime} min`
                                      : "-"}
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 text-sm border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    {isWatched ? (
                                      <span className="inline-flex items-center gap-1 text-green-600">
                                        <Check className="h-4 w-4" />
                                        Watched
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        Unwatched
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    role="cell"
                                    className="p-3 border-b border-border group-hover:bg-accent transition-colors"
                                  >
                                    {isWatched ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleMarkUnwatched(episode)
                                        }
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Unwatch
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleMarkWatched(episode)
                                        }
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Watch
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {dayEpisodes.map((episode) => (
                          <EpisodeCard
                            key={episode.id}
                            episode={episode}
                            onUpdate={handleUpdate}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
            {dayKeysWithEpisodes.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDaysToShow((prev) => prev + 7)}
                  disabled={loading || loadingMore}
                >
                  {loadingMore && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default RecentlyAired;
