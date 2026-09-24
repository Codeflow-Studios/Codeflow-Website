# Website releases

The live website is served from SiteGround. Only `Codeflow-Studios/Codeflow-Website` deploys it. Railway keeps the game and Marketing AI services online.

## Release

1. Make and review website changes on the `staging` branch at `www.codeflowstudios.dev`.
2. Merge the reviewed change into `main`. A push to `main` starts the SiteGround workflow automatically.
3. Confirm that the GitHub Actions run succeeded, then check `https://www.codeflowstudios.be/`, an onboarding page, `/skumic`, and the marketing API proxy.
4. Record the successful commit SHA from the workflow run. The workflow also stores the exact static build as an artifact for 14 days.

## Roll back

1. In GitHub Actions, open **Deploy website to SiteGround** and choose **Run workflow**.
2. Enter the full SHA of an earlier commit on `main` in `rollback_sha`. Use `dry_run` first to check the files and FTPS connection.
3. Run again with `dry_run` off to restore that build. Confirm the run succeeded and recheck the public routes.

The workflow does not delete remote files. A rollback restores files present in the older build, while files introduced by a newer release may remain until they are removed deliberately.
