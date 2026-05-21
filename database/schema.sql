-- Tajitech Database Schema
-- MySQL Database for describing technologies and building different kinds of websites

-- Create database
CREATE DATABASE IF NOT EXISTS tajitech;
USE tajitech;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  profile_picture_url VARCHAR(255),
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_is_admin (is_admin)
);

-- =====================================================
-- WEBSITE TYPES/CATEGORIES
-- =====================================================
CREATE TABLE website_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url VARCHAR(255),
  slug VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active)
);

-- =====================================================
-- TECHNOLOGIES TABLE
-- =====================================================
CREATE TABLE technologies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  category ENUM('frontend', 'backend', 'database', 'hosting', 'tools', 'other') NOT NULL,
  description TEXT,
  official_url VARCHAR(255),
  logo_url VARCHAR(255),
  version VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_name (name)
);

-- =====================================================
-- TECHNOLOGY DESCRIPTIONS & DETAILS
-- =====================================================
CREATE TABLE tech_descriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tech_id INT NOT NULL,
  description TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  use_cases TEXT,
  learning_difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
  popularity_score INT DEFAULT 0 COMMENT 'Score 0-100 for popularity',
  community_size VARCHAR(100),
  documentation_quality ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY unique_tech_desc (tech_id)
);

-- =====================================================
-- WEBSITE TEMPLATES
-- =====================================================
CREATE TABLE website_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  website_type_id INT NOT NULL,
  created_by INT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  thumbnail_url VARCHAR(255),
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
  estimated_cost VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (website_type_id) REFERENCES website_types(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_website_type (website_type_id),
  INDEX idx_is_public (is_public),
  INDEX idx_is_approved (is_approved)
);

-- =====================================================
-- TEMPLATE TECH STACK
-- =====================================================
CREATE TABLE template_technologies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  tech_id INT NOT NULL,
  role VARCHAR(100) COMMENT 'e.g., Frontend Framework, Database, Hosting',
  is_required BOOLEAN DEFAULT TRUE,
  order_position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES website_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_template_tech (template_id, tech_id),
  INDEX idx_tech_id (tech_id)
);

-- =====================================================
-- USER PROJECTS/DESIGNS
-- =====================================================
CREATE TABLE user_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  website_type_id INT NOT NULL,
  template_id INT,
  status ENUM('draft', 'in_progress', 'completed', 'archived') DEFAULT 'draft',
  is_public BOOLEAN DEFAULT FALSE,
  thumbnail_url VARCHAR(255),
  estimated_budget DECIMAL(10,2),
  timeline_months INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (website_type_id) REFERENCES website_types(id),
  FOREIGN KEY (template_id) REFERENCES website_templates(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_is_public (is_public),
  INDEX idx_created_at (created_at)
);

-- =====================================================
-- PROJECT TECH STACK
-- =====================================================
CREATE TABLE project_technologies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  tech_id INT NOT NULL,
  role VARCHAR(100) COMMENT 'e.g., Frontend Framework, Database, Hosting',
  notes TEXT,
  is_alternative BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES user_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES technologies(id),
  UNIQUE KEY unique_project_tech (project_id, tech_id),
  INDEX idx_tech_id (tech_id),
  INDEX idx_role (role)
);

-- =====================================================
-- PROJECT VERSIONS/HISTORY
-- =====================================================
CREATE TABLE project_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  version_number INT NOT NULL,
  description TEXT,
  changes_made TEXT,
  created_by INT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES user_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_project_id (project_id),
  INDEX idx_version_number (version_number),
  UNIQUE KEY unique_project_version (project_id, version_number)
);

-- =====================================================
-- TECHNOLOGY REVIEWS & RATINGS
-- =====================================================
CREATE TABLE tech_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tech_id INT NOT NULL,
  user_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_title VARCHAR(200),
  review_text TEXT,
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  is_verified_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_tech_review (tech_id, user_id),
  INDEX idx_tech_id (tech_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
);

-- =====================================================
-- ADMIN LOGS
-- =====================================================
CREATE TABLE admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action VARCHAR(100),
  table_name VARCHAR(50),
  record_id INT,
  description TEXT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);

-- =====================================================
-- TECHNOLOGY COMPARISONS/FAVORITES
-- =====================================================
CREATE TABLE user_favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  tech_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_favorite (user_id, tech_id),
  INDEX idx_user_id (user_id)
);

-- =====================================================
-- TECHNOLOGY COMPARISONS
-- =====================================================
CREATE TABLE tech_comparisons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_public (is_public)
);

-- =====================================================
-- COMPARISON TECHNOLOGIES
-- =====================================================
CREATE TABLE comparison_technologies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comparison_id INT NOT NULL,
  tech_id INT NOT NULL,
  position INT DEFAULT 0,
  FOREIGN KEY (comparison_id) REFERENCES tech_comparisons(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_comparison_tech (comparison_id, tech_id)
);

-- =====================================================
-- TAGS/LABELS FOR TECHNOLOGIES
-- =====================================================
CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TECHNOLOGY TAGS MAPPING
-- =====================================================
CREATE TABLE technology_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tech_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (tech_id) REFERENCES technologies(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tech_tag (tech_id, tag_id),
  INDEX idx_tag_id (tag_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50),
  title VARCHAR(100),
  message TEXT,
  related_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_website_types_created_at ON website_types(created_at);
CREATE INDEX idx_technologies_created_at ON technologies(created_at);
CREATE INDEX idx_user_projects_created_at ON user_projects(created_at);
CREATE INDEX idx_user_projects_user_status ON user_projects(user_id, status);
CREATE INDEX idx_tech_reviews_rating ON tech_reviews(rating);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_active) 
VALUES ('admin', 'admin@tajitech.com', '$2y$10$abc123', 'Admin', 'User', TRUE, TRUE);

-- Insert website types
INSERT INTO website_types (name, description, slug, is_active, created_by) VALUES
('E-Commerce', 'Online stores and shopping platforms', 'ecommerce', TRUE, 1),
('Blog & News', 'Content publishing and blogging platforms', 'blog-news', TRUE, 1),
('Portfolio', 'Personal and business portfolios', 'portfolio', TRUE, 1),
('Social Network', 'Community and social networking platforms', 'social-network', TRUE, 1),
('Streaming Platform', 'Video and media streaming services', 'streaming', TRUE, 1),
('SaaS Application', 'Software-as-a-Service applications', 'saas', TRUE, 1);

-- Insert technologies (Frontend)
INSERT INTO technologies (name, category, description, official_url, logo_url, version, is_active, created_by) VALUES
('React', 'frontend', 'A JavaScript library for building user interfaces with components', 'https://react.dev', 'https://reactjs.org/logo.svg', '18.0', TRUE, 1),
('Vue.js', 'frontend', 'The Progressive JavaScript Framework', 'https://vuejs.org', 'https://vuejs.org/logo.svg', '3.0', TRUE, 1),
('Angular', 'frontend', 'Platform for building mobile and desktop web applications', 'https://angular.io', 'https://angular.io/logo.svg', '15.0', TRUE, 1),
('Svelte', 'frontend', 'Cybernetically enhanced web apps', 'https://svelte.dev', 'https://svelte.dev/logo.svg', '3.0', TRUE, 1);

-- Insert technologies (Backend)
INSERT INTO technologies (name, category, description, official_url, logo_url, version, is_active, created_by) VALUES
('Node.js', 'backend', 'JavaScript runtime built on Chrome V8 JavaScript engine', 'https://nodejs.org', 'https://nodejs.org/logo.svg', '18.0', TRUE, 1),
('Django', 'backend', 'The web framework for perfectionist with deadlines', 'https://www.djangoproject.com', 'https://www.djangoproject.com/logo.svg', '4.0', TRUE, 1),
('Laravel', 'backend', 'The PHP web framework for artisans', 'https://laravel.com', 'https://laravel.com/logo.svg', '9.0', TRUE, 1),
('Spring Boot', 'backend', 'Build stand-alone, production-grade Spring based Applications', 'https://spring.io/projects/spring-boot', 'https://spring.io/logo.svg', '2.7', TRUE, 1);

-- Insert technologies (Database)
INSERT INTO technologies (name, category, description, official_url, logo_url, version, is_active, created_by) VALUES
('MySQL', 'database', 'Open-source relational database management system', 'https://www.mysql.com', 'https://www.mysql.com/logo.svg', '8.0', TRUE, 1),
('PostgreSQL', 'database', 'Advanced open source database', 'https://www.postgresql.org', 'https://www.postgresql.org/logo.svg', '14.0', TRUE, 1),
('MongoDB', 'database', 'The most popular database for modern apps', 'https://www.mongodb.com', 'https://www.mongodb.com/logo.svg', '6.0', TRUE, 1),
('Firebase', 'database', 'Build apps faster with Google-powered infrastructure', 'https://firebase.google.com', 'https://firebase.google.com/logo.svg', '9.0', TRUE, 1);

-- Insert tags
INSERT INTO tags (name, slug, description) VALUES
('Framework', 'framework', 'Development framework'),
('Library', 'library', 'JavaScript library'),
('Database', 'database', 'Database management system'),
('Cloud', 'cloud', 'Cloud computing platform'),
('Open Source', 'open-source', 'Open source software');

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for popular technologies
CREATE VIEW popular_technologies AS
SELECT 
  t.id,
  t.name,
  t.category,
  td.average_rating,
  td.total_reviews,
  COUNT(DISTINCT uf.user_id) as favorite_count
FROM technologies t
LEFT JOIN tech_descriptions td ON t.id = td.tech_id
LEFT JOIN user_favorites uf ON t.id = uf.tech_id
GROUP BY t.id
ORDER BY average_rating DESC;

-- View for user project summary
CREATE VIEW user_project_summary AS
SELECT 
  up.id,
  up.user_id,
  up.name,
  up.status,
  wt.name as website_type,
  COUNT(DISTINCT pt.tech_id) as tech_count,
  up.created_at
FROM user_projects up
LEFT JOIN website_types wt ON up.website_type_id = wt.id
LEFT JOIN project_technologies pt ON up.id = pt.project_id
GROUP BY up.id;
