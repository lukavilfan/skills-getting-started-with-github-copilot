# Getting Started with GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey lukavilfan!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/lukavilfan/skills-getting-started-with-github-copilot/issues/1)

---

## Appearance and language

The page follows your device's light or dark preference until you choose a mode with the dark-mode toggle. Your choice is saved in your browser.
Use the EN/SL switch to choose English or Slovenian; that choice is saved too.

Activity names, descriptions, and schedules have Slovenian translations in [the activity data](./src/app.py). Keep the `translations.sl` fields in sync when changing an activity. The original English name remains its sign-up identifier.

## Front-end tests

With Node.js 18 or later installed, run `node --test tests/*.test.js`.

## Backend tests

From the repository root, install the dependencies and run the pytest suite:

```sh
python -m pip install -r requirements.txt
python -m pytest
```

Backend tests live in `tests/`, use FastAPI's in-process TestClient, and follow
Arrange-Act-Assert. Shared fixtures isolate activity data for each test, so no
running server is needed.

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)

