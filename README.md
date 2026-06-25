# Scaling Complex Systems Portfolio

A lightweight GitHub Pages starter site with an interactive living-network background.

The background is a generative canvas animation inspired by complex systems whose number of entities changes over time:

- nodes are born and die
- links form based on proximity
- scrolling increases the population scale
- pointer movement perturbs local structure
- clicking/tapping triggers a local birth event

## Files

```text
.nojekyll
index.html
styles.css
network-bg.js
favicon.svg
README.md
```

## Deploy on GitHub Pages

1. Unzip this file.
2. Put the files directly in the root of your GitHub Pages repository.
3. Delete any old `_config.yml` file if it contains a Jekyll theme such as `theme: jekyll-theme-architect`.
4. Commit and push.
5. In GitHub, go to **Settings → Pages** and make sure it deploys from your main branch and `/ root`.

Your repo should look like this:

```text
.nojekyll
index.html
styles.css
network-bg.js
favicon.svg
README.md
```

Not like this:

```text
complex-systems-network-site/
  index.html
  styles.css
```

## Customize

Edit `index.html` to change your name, research text, project cards, publication list, and contact links.

Edit the top of `network-bg.js` to tune the animation:

```js
minNodes: 42,
maxNodes: 170,
linkDistance: 132,
baseSpeed: 0.25
```

## Notes

This is dependency-free: no build step, no Webflow, no Jekyll theme, no package manager.
