import { useMutation, useQueryClient } from "@tanstack/react-query";
import { linkEpisodeFile, linkMovieFile, unlinkVideoFile } from "@/lib/api";

export function useLinkFile(mediaId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["media"] });

  const linkMovie = useMutation({
    mutationFn: (path: string) => linkMovieFile(mediaId, path),
    onSuccess: invalidate,
  });

  const linkEpisode = useMutation({
    mutationFn: ({ episodeId, path }: { episodeId: string; path: string }) =>
      linkEpisodeFile(episodeId, path),
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: (videoFileId: string) => unlinkVideoFile(videoFileId),
    onSuccess: invalidate,
  });

  return { linkMovie, linkEpisode, unlink };
}
