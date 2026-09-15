export interface ClipComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface YogheartClip {
  id: string;
  videoUrl: string;
  posterUrl: string;
  aspectRatio?: string;
  category?: string;
  viewsCount?: number;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
    isFollowing?: boolean;
  };
  caption: string;
  hashtags: string[];
  musicTitle: string;
  musicAuthor: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  comments: ClipComment[];
}

export const INITIAL_YOGHEART_CLIPS: YogheartClip[] = [
  {
    id: "clip-1",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-skater-performing-a-trick-in-a-skatepark-42998-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800&auto=format&fit=crop&q=80",
    category: "Travel & Vibes",
    viewsCount: 4900000,
    creator: {
      id: "user-sarah",
      name: "Sarah Jenkins",
      username: "sarah.vibes",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "Golden hour skate session downtown Montreal! Nothing beats this summer sunset breeze 🛹✨",
    hashtags: ["#yogheart", "#skate", "#goldenhour", "#montreal", "#vibes", "#summer"],
    musicTitle: "Golden Hour Sunset (Lofi Remix)",
    musicAuthor: "Sarah Jenkins • Original Sound",
    likesCount: 151240,
    commentsCount: 3265,
    sharesCount: 1420,
    isLiked: false,
    createdAt: "2h ago",
    comments: [
      {
        id: "c-1",
        userId: "user-1",
        userName: "Sophie Martin",
        userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        text: "The lighting in this clip is absolutely unreal! 😍 What park is this?",
        createdAt: "1h ago",
        likesCount: 245,
        isLiked: false
      }
    ]
  },
  {
    id: "clip-2",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-delicious-gourmet-dish-42526-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    category: "Food & Dining",
    viewsCount: 3600000,
    creator: {
      id: "user-lionel",
      name: "Lionel Chef",
      username: "lionel_culinary",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      isVerified: true,
      isFollowing: true
    },
    caption: "Finishing touches on our signature handmade truffle pasta. Would you try a bite? 🍝🌿",
    hashtags: ["#foodie", "#chefskills", "#pasta", "#gourmet", "#yogheart", "#yummy"],
    musicTitle: "Italian Cafe Accordion & Jazz",
    musicAuthor: "Chef Lionel • Original Sound",
    likesCount: 89430,
    commentsCount: 1840,
    sharesCount: 960,
    isLiked: true,
    createdAt: "4h ago",
    comments: [
      {
        id: "c-4",
        userId: "user-4",
        userName: "Amélie Côté",
        userAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        text: "My mouth is literally watering right now... please drop the full recipe! 🤤",
        createdAt: "3h ago",
        likesCount: 89,
        isLiked: true
      }
    ]
  },
  {
    id: "clip-3",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-winding-mountain-road-42416-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
    category: "Success Mindset",
    viewsCount: 442000,
    creator: {
      id: "user-maya",
      name: "Maya Chen",
      username: "maya.explores",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "Early morning drive through the Laurentians. Roadtrips heal the soul 🚗🌲⛰️",
    hashtags: ["#roadtrip", "#nature", "#aerial", "#travel", "#yogheartrides", "#peaceful"],
    musicTitle: "Ocean Waves & Acoustic Guitar",
    musicAuthor: "Acoustic Vibes • Trending Sound",
    likesCount: 214500,
    commentsCount: 4120,
    sharesCount: 3500,
    isLiked: false,
    createdAt: "6h ago",
    comments: []
  },
  {
    id: "clip-4",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-athlete-exercising-outdoors-in-the-city-43003-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
    category: "Fitness & Gym",
    viewsCount: 946000,
    creator: {
      id: "user-marcus",
      name: "Marcus Vance",
      username: "marcus.fit",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      isVerified: false,
      isFollowing: false
    },
    caption: "5 AM rooftop workout discipline. Show up for yourself every single day 💪⚡",
    hashtags: ["#fitness", "#workout", "#motivation", "#grind", "#healthy", "#yogheart"],
    musicTitle: "High Voltage Gym Beat",
    musicAuthor: "Phonk Beats • Heavy Energy",
    likesCount: 67800,
    commentsCount: 920,
    sharesCount: 450,
    isLiked: false,
    createdAt: "12h ago",
    comments: []
  },
  {
    id: "clip-5",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cute-little-dog-playing-in-the-grass-42790-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
    category: "Relationship humor",
    viewsCount: 5800000,
    creator: {
      id: "user-zoe",
      name: "Zoe & Paws",
      username: "zoe_pets",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "\"You look just like your mother\" - When he realizes we are at the dog park and not the vet 😂🐶",
    hashtags: ["#dogsoftiktok", "#puppy", "#cute", "#wholesome", "#humor", "#yogheart"],
    musicTitle: "Happy Whistle & Ukulele",
    musicAuthor: "Cute Tunes • Original Sound",
    likesCount: 342100,
    commentsCount: 8910,
    sharesCount: 12400,
    isLiked: false,
    createdAt: "1d ago",
    comments: []
  },
  {
    id: "clip-6",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-friends-at-a-music-festival-42530-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    category: "Music & Vibes",
    viewsCount: 87700,
    creator: {
      id: "user-lucas",
      name: "Lucas & Crew",
      username: "lucas.festivals",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "Song 1 (0.5 Seconds) - when the bass drops at Osheaga festival with the best crowd ever! 🎶🔥",
    hashtags: ["#musicfestival", "#vibes", "#osheaga", "#montreal", "#friends", "#edm"],
    musicTitle: "Bass Drop Euphoria (Live Festival Mix)",
    musicAuthor: "Lucas DJ • Live Audio",
    likesCount: 42300,
    commentsCount: 650,
    sharesCount: 890,
    isLiked: false,
    createdAt: "1d ago",
    comments: []
  },
  {
    id: "clip-7",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-holding-coffee-cup-while-looking-at-snowy-mountain-42686-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
    category: "Relationship humor",
    viewsCount: 7400000,
    creator: {
      id: "user-emma",
      name: "Emma Davis",
      username: "emma.cozy",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "Reasons to get a bob... One step closer to Mrs. MacDougall 💖 Cozy cabin vibes in the snow ☕❄️",
    hashtags: ["#cozyvibes", "#winter", "#cabin", "#coffee", "#mountains", "#peace"],
    musicTitle: "Warm Coffee & Lofi Beats",
    musicAuthor: "Cozy Records • Chill Lofi",
    likesCount: 512000,
    commentsCount: 9450,
    sharesCount: 18300,
    isLiked: true,
    createdAt: "2d ago",
    comments: []
  },
  {
    id: "clip-8",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-man-walking-down-a-city-street-at-night-42866-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    category: "Comedy & Skits",
    viewsCount: 5200000,
    creator: {
      id: "user-kyle",
      name: "Kyle Rivers",
      username: "kyle_comedy",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      isVerified: true,
      isFollowing: false
    },
    caption: "Rihanna is a thief, and A$AP Rocky is tired of it 😂 Late night downtown strolls",
    hashtags: ["#skits", "#humor", "#comedy", "#funny", "#streetvibes", "#montreal"],
    musicTitle: "Midnight City Groove",
    musicAuthor: "City Lights • Trending",
    likesCount: 428000,
    commentsCount: 7120,
    sharesCount: 15400,
    isLiked: false,
    createdAt: "2d ago",
    comments: []
  },
  {
    id: "clip-9",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-at-a-club-party-42488-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    category: "Apple iPhone",
    viewsCount: 595000,
    creator: {
      id: "user-sam",
      name: "Sam Tech",
      username: "sam.shotoniphone",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      isVerified: false,
      isFollowing: false
    },
    caption: "Shot on Apple iPhone 16 Pro Cinematic 4K 120fps at club underground 🎧🔊",
    hashtags: ["#shotoniphone", "#apple", "#cinematic", "#nightlife", "#dj", "#music"],
    musicTitle: "Underground House Beats",
    musicAuthor: "Sam DJ • Live Set",
    likesCount: 78900,
    commentsCount: 1430,
    sharesCount: 2100,
    isLiked: false,
    createdAt: "3d ago",
    comments: []
  }
];

export function formatClipNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}
