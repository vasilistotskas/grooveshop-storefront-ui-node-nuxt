export enum FloorChoicesEnum {
  BASEMENT = 0,
  GROUND_FLOOR = 1,
  FIRST_FLOOR = 2,
  SECOND_FLOOR = 3,
  THIRD_FLOOR = 4,
  FOURTH_FLOOR = 5,
  FIFTH_FLOOR = 6,
  SIXTH_FLOOR_PLUS = 7,
}

export enum LocationChoicesEnum {
  HOME = 0,
  OFFICE = 1,
  OTHER = 2,
}

export enum PaginationTypeEnum {
  PAGE_NUMBER = 'pageNumber',
  CURSOR = 'cursor',
  LIMIT_OFFSET = 'limitOffset',
}

export enum PaginationCursorStateEnum {
  BLOG_POSTS = 'blogPostsCursor',
  BLOG_POST_COMMENTS = 'blogPostCommentsCursor',
}

export enum ScreenSizeEnum {
  SMALL = 'sm',
  MEDIUM = 'md',
  LARGE = 'lg',
  EXTRA_LARGE = 'xl',
}
