export * from './api/universityService';
export * from './api/subjectCombinationService';
export * from './api/authService';
export * from './api/interestService';

// Export individual services from api directly
export { aiService } from './api/aiService';

// Export all functions from userService as a grouped export
export * as userService from './userService'; 