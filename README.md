<!-- Group #65's product code repository for IT Project/COMP30022 at the
University of Melbourne, semester 2, 2024. -->

# ASIST: Annotation & SAM Image Segmentation Tool

## Table of Contents

- [Project Description](#project-description)
- [Development Team](#development-team)
- [Demonstration](#demonstration)
- [Dependencies](#dependencies)
  - [Frontend](#frontend-dependencies)
  - [Backend](#backend-dependencies)
- [Installation](#installation)
  - [Frontend](#frontend-installation)
  - [Backend](#backend-installation)
- [Instructions for Use](#instructions-for-use)
- [Testing](#testing)

## Project Description

This tool streamlines the image annotation process for C-LARA image books,
building on standard manual annotation tools with the integration of SAM 2, an
AI-powered segmentation tool by Meta. Our solution provides both manual and
AI-assisted methods to map vocabulary to specific image regions, facilitating
faster and more accurate image-based content creation for language learners.

## Team Members (Group #65)

### Product Owner

- **Hamish Wallace**
  📧 [hwallace@student.unimelb.edu.au](mailto:hwallace@student.unimelb.edu.au)

### Scrum Master

- **Gavin Lim**
  📧 [gavlim@student.unimelb.edu.au](mailto:gavlim@student.unimelb.edu.au)

### Development Team

- **Hamish Wallace**
  📧 [hwallace@student.unimelb.edu.au](mailto:hwallace@student.unimelb.edu.au)
- **Gavin Lim**
  📧 [gavlim@student.unimelb.edu.au](mailto:gavlim@student.unimelb.edu.au)
- **Sinclair Mosley**
  📧 [smosley@student.unimelb.edu.au](mailto:smosley@student.unimelb.edu.au)
- **Nicholas Sean**
  📧 [nphang@student.unimelb.edu.au](mailto:nphang@student.unimelb.edu.au)
- **Sebastian Kuszner**
  📧 [skuszner@student.unimelb.edu.au](mailto:skuszner@student.unimelb.edu.au)

## Demonstration

![Link to demonstration video](https://github.com/user-attachments/assets/2626b8f6-57fa-40dd-9db9-a54894c135be)

## Dependencies

### Frontend <a id="frontend-dependencies"></a>

- [Node Package Manager v10.9.0](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)
  - [React v18.3.1](https://react.dev/learn/installation)
  - [Axios v1.7.7](https://www.npmjs.com/package/axios#installing)

### Backend <a id="backend-dependencies"></a>

- [Python v3.12.7](https://www.python.org/downloads/)
- SAM-2 (see installation instruction below for details)

## Installation

Note that both the frontend and backend must be deployed for ASIST to work in a
development environment as designed.

1. Install SAM-2:

   1.1. Follow the installation instructions [here](https://github.com/facebookresearch/sam2?tab=readme-ov-file#installation) up to and including the first
   code snippet. This will set up the core environment and dependencies
   necessary for SAM-2 to operate.

   1.2. Next, download the [model checkpoints](https://github.com/facebookresearch/sam2?tab=readme-ov-file#model-description) `sam2.1_hiera_large.pt`, `sam2.1_hiera_base_plus.pt`, `sam2.1_hiera_small.pt` and `sam2.1_hiera_tiny.pt`. Once the
   downloads are complete, place the checkpoint files inside `<repo-root>/backend/ImageAnnotatorSAM2/checkpoints/`.

2. Clone this repository onto your local machine.

3. Install the following Python packages within your shell environment:

   - `scikit-image`
   - `matplotlib`
   - `django`
   - `djangorestframework`
   - `django-cors-headers`
   - If using pip, the following command should be sufficient to install them all:

     ```bash
     pip install django djangorestframework django-cors-headers scikit-image matplotlib
     ```

### Frontend <a id="frontend-installation"></a>

1. From the repository’s root directory, enter the frontend folder:

   ```bash
   cd frontend
   ```

2. Install the project’s node dependencies:

   ```bash
   npm install
   ```

3. To deploy the frontend:

   - Run:

     ```bash
     npm run dev
     ```

   - Open the URL it details in your browser. You should be able to use the
     frontend to interface with the app and all of its functionalities.

### Backend <a id="backend-installation"></a>

1. From the repository’s root directory, enter the backend folder:

   ```bash
   cd backend
   ```

2. Update the project’s database schema with the following commands:

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. To deploy the backend:

   - Run:

     ```bash
     python manage.py runserver
     ```
    - Look for the output
     `Starting development server at <http://address:portNumber/>`. For example,
     if `http://127.0.0.1:8000/` is produced, the backend server URL is `http://127.0.0.1:8000`.

   - *Optional for development*: If you want to view and manage backend data, you can access the Django admin panel by appending `/admin` to the server URL (e.g., `http://127.0.0.1:8000/admin`). To enable access to the admin panel, you’ll         first need to create a superuser account by running `python manage.py createsuperuser` in the backend folder (`/backend/`) then following the prompts to create an admin user.

## Instructions for Use

Segment and annotate images with the power of SAM-2.

- **Inclusion Point**: Informs SAM of a point in image which should join a segment.
- **Exclusion Point**: Informs SAM of a point in image which should be excluded
  from a segments.
- **Bounding Box**: Input to SAM in form of bounding box; SAM intelligently
  deduces the content within it that you intended to segment.
- **Clear All**: Removes all inclusion/exclusion points and any bounding boxes
  from the image preview.
- **Eraser**: Enables user to individually delete any inclusion/exclusion
  points or bounding boxes from the image preview.
- **Auto-Segment**: Prompts generation of a segmentation 'mask' for the
  currently-selected image via SAM-2.

## Testing

### Overview

The testing approach combines automated testing for functional components
using Vitest and manual testing for non-functional aspects. Automated tests are
written for functional aspects and cover various scenarios to verify that
components respond as expected to user interactions. Non-functional testing is
conducted manually to evaluate aspects such as usability, performance, and accessibility.

### Instructions

- How to run test cases

  ```sh
  cd frontend

  npm install

  npm run test
  ```

  A list of all the test cases ran and their pass status will be displayed in
  the terminal.

- How to generate a test coverage report

  ```sh
  cd frontend

  npm install

  npm run test:cov
  ```

  A list of all the test cases ran and their pass status will be displayed in
  the terminal. A table showing the overall test coverage will also be displayed.

  A new coverage directory will be created containing an interactive website to
  view test coverage.

### Test Cases

All automatic test cases are contained in App.test.jsx and will run
automatically via a GitHub Actions CI pipeline whenever merging into the
develop or master branch.
