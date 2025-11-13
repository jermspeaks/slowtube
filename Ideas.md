# Ideas

- [x] Date range filter for dashboard, stats, and group views
- [x] Pagination! Might be good to only show 100 items at a time?
- [x] Add a count of videos next to the channel in group view
- [x] Add import for movies and tv shows from stremio
- [x] Dark Mode
- [x] Change over from alerts to shadcn sonner
- [x] TV Show episodes view for archive
- [x] TV show filters - need to include filter by status, archived/unarchive, AND sort by title, first air date, next episode date, asc and desc. Actions need to be a dropdown for delete and archive. Delete will need a dialog to confirm we want to delete the tv show. Table needs to include how much we've watched the show (watched complete)
- [ ] Subscribed channels view -- import the subscribed channels and see latest videos PER channel
- [ ] Create lists (segments) of subscribers so I can group WHICH videos I want to see by my grouping
- [ ] Adding tags to channels so I can easily organize and filter by that
- [ ] Channels view - seeing what channels I've added to watch later
- [ ] Channel details - fetch the latest channel information
- [ ] Card and table view should be organized as different pages altogether. They serve different purposes.
- [ ] Video player - we should add video player capability.
- [ ] Descriptions should be capped at 3 lines, then a show more button.
- [ ] Export video information as markdown
- [ ] Export channel information as markdown
- [ ] Add favicon
- [ ] import liked videos. Allow us to analyze them, see what channels are cool, etc.
- [ ] Add a download function per video so we can have a local copy to do playback
  - [ ] Add sponsorblock so we can skip past it
- [ ] We need to add Letterboxd import so we can later export all movies that we can add to a logging website where we can show a full list of all consumed. Idea is we can either export to my current Astro site or setup a lightweight
- [ ] Star movies and tv shows we want to watch
- [ ] Group or Playlist mode that we can organize lists and have them be in the watch page
    - [ ] Playlists should be universal other media types besides watch later as well
- [ ] Organize should be more videos in our inbox that we want to view and start to group together. That way, watch is more relevant to top, then other organized lists
- [ ] We need bulk actions on groups / playlists to move all to a different state (feed, inbox, or archive)
- [ ] Tag filtering in the discover
- [ ] Upcoming calendar needs a list and card view as well. We should have a toggle for these as it's easy to show the gaps, but sometimes I don't care about gaps at all. Add a day where it says, "There's nothing here on this day" so we know there's no TV shows for those days
- [ ] Responsive view per pages. Start with dashboard
- [ ] Optimistic UI for state transitions of video cards from feed -> inbox or archive so it's not jarring to jump from bottom to top. Revisit how re-renders should work here
- [ ] TV Show list page needs to have filters cleared button

## Questions

- [x] Do we still need Google OAuth w/ YouTube capabilities?

## Bugs

- [x] Better filters and sort view, since it's starting to clutter terrible. We should have a show more, so only show most prominent items on top. It should all be in a different background color.
- [x] Group view showing all again
- [x] Channel filter not filtering by the channel names
- [x] Upcoming calendar - UTC is being used, not PST/PDT
- [x] Upcoming calendar - we should see the retroactive view as well. Made a mistake here.
- [ ] The "Filter with all, feed, inbox, and archive" need to now just be feed, inbox, and archive. No need to have "All" unless we are in group view.
- [ ] Settings should be moved to the rightmost side, not left at all.
- [ ] Migrate over to shadcn buttons everywhere
- [ ] Looks like the page is acting slow because it's loading a ton of videos at once. What other tactics to improve performance
