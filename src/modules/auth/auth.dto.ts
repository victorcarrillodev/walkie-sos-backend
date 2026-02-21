export interface RegisterDto {
  email: string
  password: string
  username: string
  fullName?: string
}

export interface LoginDto {
  email: string
  password: string
}
