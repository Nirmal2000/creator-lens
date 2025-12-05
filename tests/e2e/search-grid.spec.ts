import { test, expect } from "@playwright/test";

test.describe("Search grid", () => {
  test("submits keyword and loads more videos", async ({ page }) => {
    await page.route("**/api/search", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            searchId: "search-1",
            media: [
              {
                platform: "tiktok",
                externalId: "init-1",
                title: "Initial video",
                description: "desc",
                authorHandle: "creator",
                authorName: "Creator",
                profileImageUrl: "",
                stats: { likes: 1 },
                durationSeconds: 15,
                thumbnailUrl: "https://placehold.co/200x300",
                playbackUrl: null,
              },
            ],
            platformStatus: { tiktok: { status: "fulfilled" } },
          }),
        });
        return;
      }
      route.continue();
    });

    await page.route("**/api/search/search-1/more", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          searchId: "search-1",
          media: [
            {
              platform: "tiktok",
              externalId: "more-1",
              title: "More video",
              description: "desc",
              authorHandle: "creator",
              authorName: "Creator",
              profileImageUrl: "",
              stats: { likes: 2 },
              durationSeconds: 20,
              thumbnailUrl: "https://placehold.co/200x300",
              playbackUrl: null,
            },
          ],
          platformStatus: { tiktok: { status: "fulfilled" } },
        }),
      });
    });

    await page.goto("/search");

    await expect(page.getByRole("heading", { name: /discover creators/i })).toBeVisible();
    const keywordInput = page.getByPlaceholder("e.g. hybrid training drills");
    await keywordInput.fill("hybrid training inspiration");
    await page.getByRole("button", { name: /search/i }).click();

    await expect(page.getByRole("button", { name: /more videos/i })).toBeVisible();
    await page.getByRole("button", { name: /more videos/i }).click();
    await expect(page.getByText("More video")).toBeVisible();
  });
});
