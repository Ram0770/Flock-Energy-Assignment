# Engineering Reflection: Legacy Telemetry Wrapper & Premium Dashboard

This document details the engineering reflections, challenges, trade-offs, and decisions made during the execution of the Flock Energy Take-Home Assignment.

---

## 1. Assumptions Made

- **Mock Legacy Environment:** Since no public legacy Urja Meter portal URL or test credentials were provided, we assumed it was standard design to implement a dedicated Mock Legacy Portal service inside our backend directory. This service serves raw, clunky HTML templates containing custom CSS tables, form-based logins, session cookies, and single-use CSRF tokens. This approach enabled complete, end-to-end local scraping validation without fabricating protocol details.
- **Cache Graceful Fallback:** We assumed that Redis might not be installed or active on local testing machines. Therefore, the `CacheRepository` was engineered with a dual-engine architecture: it pings Redis asynchronously on startup, and if the ping fails, it gracefully falls back to an asynchronous in-memory dictionary.
- **Dynamic Leaflet Integration:** Map coordinate overlays are rendered using Leaflet. Since Leaflet relies on the browser's `window` object (which is absent during Next.js SSR build phases), we assumed dynamic importing of Leaflet elements (`dynamic(() => import(...), { ssr: false })`) combined with dynamic CSS injection was necessary to avoid compile-time crashes.

---

## 2. Most Difficult Challenge

The most difficult challenge was implementing **background auto re-login mechanics** within the asynchronous HTTP scraping lifecycle. 

Scraping legacy systems is inherently flaky; sessions expire, cookies get invalidated, and the portal redirects back to the login screen with a `302/307` header. 
To resolve this:
- We designed `UrjaClient.request_with_auth` to capture redirect header locations.
- If it detects a redirect pointing to `/legacy/login` or receives an HTTP `401/403` status, it intercept the execution flow, triggers a background re-authentication handshake (fetches a new CSRF token, posts login parameters, and updates the local cookie store), and then retries the initial request.
- Using `tenacity` retry wrappers configured with exponential backoffs ensures that transient network hiccups are handled gracefully without failing the outer REST API call.

---

## 3. Mistakes Made & Corrected

- **FastAPI Dependency Injection in Unit Tests:** Initially, unit tests for API endpoints used `unittest.mock.patch` to override the `get_meter_service` dependency. However, FastAPI compiles routes and dependencies during definition, rendering module-level patching ineffective. This caused tests to execute the real dependency which threw connection errors because Redis and the legacy portal were offline. We resolved this by utilizing FastAPI's official `app.dependency_overrides` dictionary to correctly inject mocks.
- **Next.js SSR Leaflet Reference:** The initial layout compile for Leaflet referenced `window.L` directly in the global scope. This caused the Next.js compile build phase to fail since Next.js pre-renders pages on the server side. We refactored the map component to dynamically import Leaflet inside a `useEffect` hook, which safely deferred execution to the client browser.
- **Javascript Array Types:** In the MetricCards component, we attempted to query the `.count` property of a Javascript array. We corrected this by utilizing the standard `.length` property.

---

## 4. Future Improvements

- **Webhooks & Change Data Capture (CDC):** Scraping in response to API requests introduces latency. We could implement a background celery task scheduler to periodically scrape the legacy portal and write updates directly to a relational database, turning wrapper queries into instant read actions.
- **User Session Binding:** Currently, the wrapper maintains a single shared operator session with the legacy portal. In production, we should map individual wrapper user accounts to legacy credential sets to preserve audit trails.
- **UI Playbacks:** Integrating real-time web socket feeds or Severn/SSE notifications would allow metric cards to tick dynamically as new readings are scraped.

---

## 5. Self-Review

The project satisfies all conditions of the Flock Energy Take-Home Assignment:
- **Clean Architecture:** Clean division of adapters, service layer, models, and controllers in Python.
- **Session Management:** Autologin, retries, and CSRF token parsing implemented.
- **High-Fidelity UI:** Glassmorphism dashboard using Next.js 15, Recharts, and Leaflet Map, looking like a premium SaaS dashboard.
- **Dockerized Setup:** Single `docker-compose.yml` file configuring Redis, scraper API, mock legacy portal, and Next.js frontend, ready for production orchestration.
