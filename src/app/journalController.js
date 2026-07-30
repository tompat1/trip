import { state } from "../state.js";

export function inferMomentCategory(categories = []) {
  const text = categories.join(" ").toLowerCase();
  if (/coffee|cafe/.test(text)) return "Coffee";
  if (/restaurant|food|bar|pub/.test(text)) return "Restaurant";
  if (/museum|gallery|culture/.test(text)) return "Museum";
  if (/park|garden|viewpoint|nature/.test(text)) return "Outdoor";
  return "";
}

export function buildJournalTemplateStory(templateId, trip, selectedMomentIds = []) {
  const destination = trip.destination || "this trip";
  const moments = (state.moments || []).filter((moment) => moment.tripId === trip.id);
  const selectedSet = new Set(selectedMomentIds || []);
  const allMediaMoments = moments.filter(hasUsableStoryMedia);
  const mediaMoments = selectedSet.size ? allMediaMoments.filter((moment) => selectedSet.has(moment.id)) : allMediaMoments;
  const noteMoments = moments.filter(isWrittenStoryNote);
  const activities = trip.calendarEvents || [];
  const highlights = getTripHighlightTitles(trip);
  const templateBuilders = {
    "photo-essay": buildPhotoEssayStory,
    "day-recap": buildDayRecapStory,
    "share-card": buildShareCardStory,
    "city-guide": buildCityGuideStory,
    "food-journal": buildFoodJournalStory,
    "travel-film": buildTravelFilmStory,
    "route-story": buildRouteStoryStory,
    "travel-log": buildTravelLogStory,
  };
  const build = templateBuilders[templateId] || buildTravelLogStory;
  return {
    ...build({ trip, destination, moments, mediaMoments, noteMoments, activities, highlights }),
    selectedMomentIds: mediaMoments.map((moment) => moment.id),
  };
}

export function getRecommendedTemplateMomentIds(templateId, trip) {
  const mediaMoments = (state.moments || [])
    .filter((moment) => moment.tripId === trip.id && hasUsableStoryMedia(moment))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || a.date || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || b.date || 0).getTime();
      return bTime - aTime;
    });

  const maxByTemplate = {
    "share-card": 1,
    "day-recap": 6,
    "photo-essay": 8,
    "city-guide": 6,
    "food-journal": 6,
    "travel-film": 10,
    "route-story": 8,
    "travel-log": 12,
  };

  let ranked = mediaMoments;
  if (templateId === "food-journal") {
    const foodFirst = mediaMoments.filter((moment) => /food|coffee|cafe|wine|restaurant|dinner|lunch/i.test(getMomentSearchText(moment)));
    ranked = [...foodFirst, ...mediaMoments.filter((moment) => !foodFirst.includes(moment))];
  } else if (templateId === "travel-film") {
    const videosFirst = mediaMoments.filter((moment) => String(moment.type || "").toLowerCase() === "video");
    ranked = [...videosFirst, ...mediaMoments.filter((moment) => !videosFirst.includes(moment))];
  } else if (templateId === "route-story" || templateId === "city-guide") {
    const placeFirst = mediaMoments.filter((moment) => moment.placeTitle || moment.geoLabel);
    ranked = [...placeFirst, ...mediaMoments.filter((moment) => !placeFirst.includes(moment))];
  }

  return ranked.slice(0, maxByTemplate[templateId] || 6).map((moment) => moment.id);
}

function getMomentSearchText(moment = {}) {
  return [
    moment.title,
    moment.placeTitle,
    moment.placeCategory,
    moment.geoLabel,
    ...(moment.tags || []),
  ].filter(Boolean).join(" ");
}

function buildPhotoEssayStory({ destination, mediaMoments, noteMoments }) {
  const mediaCount = mediaMoments.length;
  const firstMedia = mediaMoments[0];
  const captionSeeds = mediaMoments
    .slice(0, 4)
    .map((moment) => moment.placeTitle || moment.geoLabel || moment.title)
    .filter(Boolean);

  return {
    templateId: "photo-essay",
    templateLabel: "Photo essay",
    kicker: "VISUAL MEMORY TEMPLATE",
    title: `${destination} in Frames`,
    lead: mediaCount
      ? `${mediaCount} captured ${mediaCount === 1 ? "moment" : "moments"} from ${destination}, ready to shape into a visual story.`
      : `A photo essay for ${destination}, ready for the first captures from Quick Capture.`,
    sections: [
      {
        title: "Opening Frame",
        body: firstMedia
          ? `${firstMedia.title || "The first saved frame"} sets the tone, anchored near ${firstMedia.placeTitle || firstMedia.geoLabel || destination}.`
          : `Start with one strong cover image from ${destination}: arrival, first light, a street detail, or the first shared meal.`,
      },
      {
        title: "Sequence",
        body: captionSeeds.length
          ? `Build the flow around ${formatInlineList(captionSeeds)}. Keep the captions short, place-led, and sensory.`
          : "Once media is added, arrange the gallery by place, light, and movement rather than upload order.",
      },
      {
        title: "Caption Notes",
        body: noteMoments.length
          ? `Use ${noteMoments.length} saved ${noteMoments.length === 1 ? "note" : "notes"} as caption material.`
          : "Add quick notes while traveling so each photo has context beyond the filename.",
      },
    ],
  };
}

function buildDayRecapStory({ trip, destination, mediaMoments, noteMoments, activities }) {
  const days = groupActivitiesByDay(activities).slice(0, 5);
  const sections = days.length
    ? days.map((day) => ({
        title: day.title,
        body: `${day.items.map((event) => event.title).slice(0, 4).join(", ")}${day.items.length > 4 ? ", and more" : ""}.`,
      }))
    : [{
        title: "Day Notes",
        body: `No itinerary blocks are scheduled yet, so this recap can start from captures and notes from ${destination}.`,
      }];

  sections.push({
    title: "Captured Along The Way",
    body: `${mediaMoments.length} media ${mediaMoments.length === 1 ? "item" : "items"} and ${noteMoments.length} ${noteMoments.length === 1 ? "note" : "notes"} are available for the recap.`,
  });

  return {
    templateId: "day-recap",
    templateLabel: "Day-by-day recap",
    kicker: "ITINERARY MEMORY TEMPLATE",
    title: `${destination} Day by Day`,
    lead: `A chronological recap for ${trip.dates || destination}, built from the itinerary, captures, and personal notes.`,
    sections,
  };
}

function buildShareCardStory({ destination, mediaMoments, noteMoments, highlights }) {
  const topHighlight = highlights[0] || mediaMoments[0]?.placeTitle || destination;
  return {
    templateId: "share-card",
    templateLabel: "Share card",
    kicker: "COMPACT SHARE TEMPLATE",
    title: `Postcard from ${destination}`,
    lead: `${topHighlight} became the headline moment. Plan it. Live it. Remember it.`,
    sections: [
      {
        title: "Front",
        body: mediaMoments.length
          ? `Use the strongest image from ${mediaMoments[0].placeTitle || mediaMoments[0].geoLabel || destination} as the cover.`
          : "Add one cover capture to turn this into a share-ready memory card.",
      },
      {
        title: "Back",
        body: noteMoments[0]?.text || `A short memory from ${destination}, tuned for sharing with fellow travelers.`,
      },
      {
        title: "Details",
        body: `${mediaMoments.length} captures, ${noteMoments.length} notes, and ${highlights.length} suggested highlights can feed this card.`,
      },
    ],
  };
}

function buildTravelLogStory({ destination, noteMoments, activities, highlights }) {
  const sections = noteMoments.length
    ? noteMoments.slice(0, 5).map((moment) => ({
        title: moment.title || moment.date || "Travel note",
        body: moment.text || "Saved as a travel log entry.",
      }))
    : [
        {
          title: "First Entry",
          body: `Start the travel log with what changed your plan, what surprised you, and what you want to remember from ${destination}.`,
        },
        {
          title: "Places To Mention",
          body: highlights.length ? formatInlineList(highlights.slice(0, 5)) : `${activities.length} itinerary items are ready to become log entries.`,
        },
      ];

  return {
    templateId: "travel-log",
    templateLabel: "Travel log",
    kicker: "NOTES-FIRST TEMPLATE",
    title: `${destination} Travel Log`,
    lead: `A written archive for ${destination}, shaped around notes, observations, and the route as it unfolds.`,
    sections,
  };
}

function buildCityGuideStory({ destination, activities, highlights }) {
  const city = destination.split(",")[0];
  const guideStops = highlights.length ? highlights.slice(0, 5) : activities.map((event) => event.title).filter(Boolean).slice(0, 5);
  return {
    templateId: "city-guide",
    templateLabel: "City guide",
    kicker: "RECOMMENDATION GUIDE TEMPLATE",
    title: `${city} Guide`,
    lead: `A compact guide to ${destination}, built from saved places, itinerary anchors, and TRIP recommendations.`,
    sections: [
      {
        title: "Start Here",
        body: guideStops.length ? `Lead with ${formatInlineList(guideStops.slice(0, 3))}.` : `Add saved spots to shape the first ${city} guide.`,
      },
      {
        title: "Recommended Rhythm",
        body: "Keep this guide useful: one morning anchor, one food stop, one local walk, and one flexible evening option.",
      },
      {
        title: "For Fellow Travelers",
        body: "Use this as the companion-friendly version: short descriptions, clear why-go notes, and quick itinerary actions.",
      },
    ],
  };
}

function buildFoodJournalStory({ destination, noteMoments, highlights }) {
  const foodNotes = noteMoments.filter((moment) => /coffee|cafe|food|wine|dinner|lunch|restaurant/i.test(`${moment.title || ""} ${moment.text || ""}`));
  return {
    templateId: "food-journal",
    templateLabel: "Food journal",
    kicker: "TASTE MEMORY TEMPLATE",
    title: `${destination} Food Journal`,
    lead: "A taste-led memory page for cafes, restaurants, wine, and the small rituals that made the trip feel local.",
    sections: [
      {
        title: "Best Bite",
        body: foodNotes[0]?.text || `Choose one meal, cafe, market, or wine stop from ${destination} as the headline memory.`,
      },
      {
        title: "Places To Revisit",
        body: highlights.length ? formatInlineList(highlights.slice(0, 4)) : "Save restaurants and cafes from Search to build this list.",
      },
      {
        title: "Notes For Next Time",
        body: "Capture what to order again, what time to go, and who in the group loved it most.",
      },
    ],
  };
}

function buildTravelFilmStory({ destination, mediaMoments }) {
  return {
    templateId: "travel-film",
    templateLabel: "Travel film",
    kicker: "VIDEO MOMENTS TEMPLATE",
    title: `${destination} Travel Film`,
    lead: mediaMoments.length
      ? `${mediaMoments.length} visual moments can become a short cinematic cut.`
      : `A film outline for ${destination}, ready for video captures and motion moments.`,
    sections: [
      {
        title: "Opening Shot",
        body: mediaMoments[0]?.placeTitle || `Begin with movement: arrival, street rhythm, transit, or the first view of ${destination}.`,
      },
      {
        title: "Middle Sequence",
        body: "Mix wide location shots with food, faces, details, and route movement.",
      },
      {
        title: "Final Beat",
        body: "End with a quiet image, sunset, night walk, or a companion moment worth remembering.",
      },
    ],
  };
}

function buildRouteStoryStory({ destination, activities }) {
  const routeStops = activities.map((event) => event.location || event.title).filter(Boolean).slice(0, 6);
  return {
    templateId: "route-story",
    templateLabel: "Route story",
    kicker: "MAP MEMORY TEMPLATE",
    title: `${destination} Route Story`,
    lead: `A map-led story of how the trip moved through ${destination}.`,
    sections: [
      {
        title: "Route Spine",
        body: routeStops.length ? formatInlineList(routeStops) : `Add itinerary stops to draw the main route through ${destination}.`,
      },
      {
        title: "Why This Route",
        body: "Frame the route around fewer jumps, better nearby discoveries, and moments that are easy to share with companions.",
      },
      {
        title: "Map Notes",
        body: "Use Gallery captures and place tags to pin memories directly onto the route.",
      },
    ],
  };
}

function hasUsableStoryMedia(moment = {}) {
  const mediaUrl = moment.media_url || moment.mediaUrl || "";
  const type = String(moment.type || "").toLowerCase();
  return Boolean(mediaUrl) && ["photo", "video", "image", ""].includes(type);
}

function isWrittenStoryNote(moment = {}) {
  const type = String(moment.type || "note").toLowerCase();
  return !["photo", "video", "image"].includes(type) && !(moment.media_url || moment.mediaUrl);
}

function getTripHighlightTitles(trip) {
  const saved = trip.ideas?.filter((idea) => state.savedPlaceIds?.has(idea.id)) || [];
  const source = saved.length ? saved : (trip.ideas || []);
  return source.map((idea) => idea.title).filter(Boolean);
}

function groupActivitiesByDay(activities = []) {
  const byDay = new Map();
  activities.forEach((event) => {
    const key = event.dayName || `Day ${Number(event.dayIndex || 0) + 1}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  });
  return Array.from(byDay.entries()).map(([title, items]) => ({ title, items }));
}

function formatInlineList(items = []) {
  const clean = items.filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}
