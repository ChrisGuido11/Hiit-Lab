// Mapping of exercise names to YouTube video IDs for instructional videos
export const EXERCISE_VIDEOS: Record<string, string> = {
  "Push-ups": "IODxDxX7oi4",
  "Burpees": "TFLyWHvAHzI",
  "Squat": "xqvCmoLULNY",
  "Lunges": "QOVaHJAxMKA",
  "Pull-ups": "eGo4IYlbE5g",
  "Dumbbell Rows": "w6UE99pHQFU",
  "Dumbbell Lunges": "QOVaHJAxMKA",
  "Box Step-ups": "K_sKdwqf3JY",
  "Mountain Climbers": "nmwgiRdu_14",
  "Jumping Jacks": "DMnx1-OMkx8",
  "Plank Hold": "pSHjTRCQxIw",
  "Dumbbell Thrusters": "EIz4vJm-KqI",
  "Kettlebell Swings": "dtB8V-xzx5c",
  "Box Jumps": "fxgkEJV4zXM",
  "Plank": "pSHjTRCQxIw",
  "Deadlifts": "r4MzxtBKyNE",
  "Bench Press": "SCVCLChPQFY",
  "Shoulder Press": "2yjwXTZQDDY",
  "Bicep Curls": "ykJmrsCJLjc",
  "Tricep Dips": "0326thy3mN4",
  "Lateral Box Step-overs": "K_sKdwqf3JY",
  "Slider Lunges": "QOVaHJAxMKA",
  "Rope Jumps": "n_NekFrRNkc",
  "Running in Place": "3__zLf3ZN6M",
  "High Knees": "K_sKdwqf3JY",
  "Butt Kicks": "8bxKpBKysjc",
  "Battle Ropes": "r5u6sn2Wjys",
  "Medicine Ball Slams": "d7qmVdXVKOQ",
  "Box Pushups": "IODxDxX7oi4",
  "Handstand Hold": "Jxp2lR_fwrA",
  "Wall Sits": "x3vPBpk6vD0",
  "Glute Bridges": "gsMNuNNQ8IE",
};

export function getVideoUrlForExercise(exerciseName: string): string {
  const videoId = EXERCISE_VIDEOS[exerciseName];
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
  }
  
  // Fallback: Open YouTube search in new window
  return `https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(exerciseName)}`;
}

export function hasDirectVideo(exerciseName: string): boolean {
  return !!EXERCISE_VIDEOS[exerciseName];
}
