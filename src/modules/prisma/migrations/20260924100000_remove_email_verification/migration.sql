-- Drop email-verification tokens before shrinking the enum.
DELETE FROM "verification_tokens" WHERE "type" = 'EMAIL_VERIFICATION';

ALTER TYPE "TokenType" RENAME TO "TokenType_old";
CREATE TYPE "TokenType" AS ENUM ('RESET_PASSWORD');
ALTER TABLE "verification_tokens"
  ALTER COLUMN "type" TYPE "TokenType" USING ("type"::text::"TokenType");
DROP TYPE "TokenType_old";

ALTER TABLE "users" DROP COLUMN "is_verified";
