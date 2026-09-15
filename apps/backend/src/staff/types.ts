/**
 * Represents the possible statuses of a Staff user in the system. The Status enum defines two roles: 'ADMIN' and 'STANDARD'.
 * 
 * - 'ADMIN': Represents a Staff user with administrative privileges, allowing them to manage other users and perform higher-level operations within the system.
 * - 'STANDARD': Represents a Staff user with standard privileges, allowing them to perform basic operations within the system like submitting resources.
 */
export enum Type {
  ADMIN = 'ADMIN',
  STANDARD = 'STANDARD',
}
