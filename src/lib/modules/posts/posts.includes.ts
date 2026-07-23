export const postFeedWith = {
  author: {
    columns: { id: true, name: true, image: true },
  },
  media: true,
  quotedPost: {
    with: {
      author: {
        columns: { id: true, name: true, image: true },
      },
      media: true,
    },
  },
} as const;
