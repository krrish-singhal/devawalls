export interface Category {
  id: string;
  name: string;
  nameEn: string;
}

export interface Wallpaper {
  id: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
