export interface User {
  id: number;
  name: string;
  email: string;
  role: 'worker' | 'employer' | 'admin';
  phone?: string;
  barangay?: string;
  municipality?: string;
  document_url?: string;
  document_back_url?: string;
  selfie_url?: string;
  business_documents?: string;
  verification_status: 'unverified' | 'pending' | 'approved' | 'rejected';
  verification_badge: boolean;
  is_suspended: boolean;
  reputation_score: number;
  registration_status?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  expo_push_token?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  last_active_at?: string;
  workerProfile?: WorkerProfile;
  employerProfile?: EmployerProfile;
}

export interface WorkerProfile {
  id: number;
  user_id: number;
  bio?: string;
  availability_status: string;
  reputation_score: number;
  skills?: Skill[];
  experiences?: WorkerExperience[];
  references?: WorkerCharacterReference[];
}

export interface EmployerProfile {
  id: number;
  user_id: number;
  description?: string;
  contact_info?: string;
  reputation_score: number;
}

export interface Skill {
  id: number;
  name: string;
  category?: string;
}

export interface WorkerExperience {
  id: number;
  worker_profile_id: number;
  job_title: string;
  employer_name: string;
  duration: string;
  description?: string;
}

export interface WorkerCharacterReference {
  id: number;
  worker_profile_id: number;
  name: string;
  phone: string;
  relationship: string;
}

export interface JobPost {
  id: number;
  employer_id: number;
  reference_number: string;
  title: string;
  description: string;
  category: string;
  categories?: string[];
  barangay?: string;
  municipality?: string;
  duration_type: string;
  compensation: string;
  slots: number;
  accepted_count: number;
  status: 'open' | 'closed_in_progress' | 'in_progress' | 'completed' | 'cancelled' | 'suspended';
  tools_required?: string;
  applications_count?: number;
  reports_count?: number;
  rating_window_expires_at?: string;
  employer?: User;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  reportable_type: string;
  reportable_id: number;
  type: string;
  description: string;
  status: 'pending' | 'open' | 'resolved' | 'dismissed';
  resolved_at?: string;
  reporter?: User;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  status: 'open' | 'processing' | 'resolved';
  admin_reply?: string;
  user?: User;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  action: string;
  description: string;
  target_id?: number;
  target_type?: string;
  admin?: User;
  created_at: string;
}

export interface ProfanityWord {
  id: number;
  word: string;
  created_at: string;
}

export interface Review {
  id: number;
  application_id: number;
  reviewer_id: number;
  reviewee_id: number;
  reviewer_role: string;
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  overall_rating: number;
  comment?: string;
  reviewer?: User;
  reviewee?: User;
  created_at: string;
}
