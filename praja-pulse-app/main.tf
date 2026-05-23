terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "praja-pulse"
}

# --- 1. ECR Repository for Backend ---
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# --- 2. S3 Bucket for Frontend ---
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${random_string.suffix.result}"
  force_destroy = true
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# --- 3. CloudFront Distribution ---
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3Origin"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# --- 4. IAM Role for App Runner to pull from ECR ---
resource "aws_iam_role" "apprunner_service_role" {
  name = "${var.project_name}-apprunner-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_service_role_policy" {
  role       = aws_iam_role.apprunner_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- 5. App Runner Service for Backend ---
resource "aws_apprunner_service" "backend" {
  service_name = "${var.project_name}-backend"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_service_role.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "8000"
      }
    }
    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = "0.25 vCPU"
    memory = "0.5 GB"
  }

  depends_on = [aws_iam_role_policy_attachment.apprunner_service_role_policy]
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "app_runner_url" {
  value = aws_apprunner_service.backend.service_url
}
