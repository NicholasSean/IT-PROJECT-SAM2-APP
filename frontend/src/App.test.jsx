import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vitest, beforeEach, beforeAll } from 'vitest';
import { when } from 'vitest-when';
import userEvent from '@testing-library/user-event';
import App from './App';
import Endpoint from './services/Endpoints';

vitest.mock('./services/Endpoints', () => {
  return {
    default: {
      post: vitest.fn(),
      get: vitest.fn(),
      delete: vitest.fn(),
      put: vitest.fn(),
    },
  };
});

const uploadTestImage = async (name) => {
  // Mock the backend response for uploading an image
  when(Endpoint.post, { times: 1 })
    .calledWith('upload/', expect.any(FormData))
    .thenResolve({
      data: { imageName: name + '.jpeg', imageLocation: name + '.jpeg', file_hash: name },
    });

  const file = new File([name], name + '.jpeg', { type: 'image/jpeg' });

  render(<App />);

  // Create a file to upload
  const uploadButton = await screen.findByTestId('img-input-elem');
  expect(uploadButton).toBeInTheDocument();

  // Upload the file and check if it was sent to the endpoint
  await userEvent.upload(uploadButton, file);

  expect
    .poll(() => Endpoint.post, { timeout: 1000 })
    .toHaveBeenCalledWith('upload/', expect.any(FormData));
};

const addAnnotation = async (img, annotation) => {
  // Press the add word button
  const addWordButton = await screen.findByText(/^add annotation$/i);
  await userEvent.click(addWordButton);

  // Type the word
  const wordInput = await screen.findByPlaceholderText('Enter word...');
  await userEvent.type(wordInput, annotation);

  // Prepare a mock response for the word submission
  const formData = new FormData();
  formData.append('associated_image', img);
  formData.append('word', annotation);

  when(Endpoint.post, { times: 1 })
    .calledWith('word/', formData)
    .thenResolve({ data: 'Mock response' });

  // Submit the word by pressing enter
  await userEvent.type(wordInput, '{enter}');
};

const selectAnnotation = async (annotation) => {
  const annotationButton = await screen.findByText(annotation);
  await userEvent.click(annotationButton);
};

const addInclusionPoint = async (x, y) => {
  // Select the inclusion point tool
  const inclusionPointText = await screen.findByText(/^inclusion point$/i);
  const inclusionPointButton = inclusionPointText.parentElement;
  await userEvent.click(inclusionPointButton);

  // Click on the image to add an inclusion point
  const imagePreview = await screen.findByAltText('Selected source-image preview');
  await userEvent.click(imagePreview, { clientX: x, clientY: y });
};

beforeEach(() => {
  when(Endpoint.get, { times: 1 }).calledWith('csrf-token/').thenResolve();
  when(Endpoint.get, { times: 1 }).calledWith('images/').thenResolve({ data: [] });
});

beforeAll(() => {
  // Mocking image.onload to be called immediately
  Object.defineProperty(Image.prototype, 'onload', {
    set(onload) {
      onload();
    },
  });

  // Mock image size properties
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    get() {
      return 100;
    },
  });

  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
    get() {
      return 100;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    value() {
      return {
        width: 100,
        height: 100,
        top: 0,
        left: 0,
      };
    },
  });
});

describe('uploading', () => {
  it('renders upload instructions', async () => {
    render(<App />);
    const uploadText = await screen.findByText(/^upload an image to begin$/i);
    expect(uploadText).toBeInTheDocument();
  });

  it('rejects non-image files', async () => {
    render(<App />);
    const uploadButton = await screen.findByTestId('img-input-elem');
    expect(uploadButton).toBeInTheDocument();

    // Upload a non-image file and check if an error message is displayed
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await userEvent.upload(uploadButton, file);

    // Expect backend to not be called
    expect(Endpoint.post).not.toHaveBeenCalled();

    // Check that upload instructions are still displayed
    const uploadText = await screen.findByText(/^upload an image to begin$/i);
    expect(uploadText).toBeInTheDocument();
  });

  it('uploads images to endpoint', async () => {
    await uploadTestImage('test');
  });

  it('displays uploaded images', async () => {
    await uploadTestImage('test');

    // Check if the uploaded image has a button to select it
    const image = await screen.findByAltText('Source image #1');
    expect(image).toBeInTheDocument();

    // Check if the image is displayed in the preview
    const preview = await screen.findByAltText('Selected source-image preview');
    expect(preview).toBeInTheDocument();

    // check if the src of the image is the same as the src of the preview
    expect(image.src).toBe(preview.src);
  });

  it('deletes an uploaded image', async () => {
    await uploadTestImage('test');
    when(Endpoint.delete, { times: 1 })
      .calledWith('delete/test/', expect.any(Object))
      .thenResolve({ data: 'Mock response' });

    // Check if the uploaded image has a delete button
    const image = await screen.findByAltText('Source image #1');
    expect(image).toBeInTheDocument();
    const preview = await screen.findByAltText('Selected source-image preview');
    expect(preview).toBeInTheDocument();
    const deleteIcon = image.parentElement.querySelector('.img-delete-icon');

    // Wait before clicking the delete button
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Delete the image and check if it was removed from the page
    await userEvent.click(deleteIcon);

    await waitFor(() => {
      expect(image).not.toBeInTheDocument();
    });

    expect(preview).not.toBeInTheDocument();

    expect(Endpoint.delete).toHaveBeenCalledWith('delete/test/', expect.any(Object));
  });

  it('does not allow for duplicate images', async () => {
    render(<App />);
    const uploadButton = await screen.findByTestId('img-input-elem');
    expect(uploadButton).toBeInTheDocument();

    // Upload the same image twice
    const file = new File(['test'], 'test.jpeg', { type: 'image/jpeg' });

    // Mock the backend response for uploading an image
    when(Endpoint.post, { times: 1 })
      .calledWith('upload/', expect.any(FormData))
      .thenResolve({
        data: { imageName: 'test.jpeg', imageLocation: 'test.jpeg', file_hash: 'test' },
      });

    await userEvent.upload(uploadButton, file);

    // Wait for the image to be uploaded
    await waitFor(() => {
      expect(screen.queryByAltText('Source image #1')).toBeInTheDocument();
    });

    // Mock the backend response for a duplicate image
    when(Endpoint.post, { times: 1 })
      .calledWith('upload/', expect.any(FormData))
      .thenReject({
        response: { status: 400, data: { message: 'This image has already been uploaded.' } },
      });

    // Wait before uploading the same image again
    await new Promise((resolve) => setTimeout(resolve, 100));

    await userEvent.upload(uploadButton, file);

    // Wait and see if the image is removed from the page
    const image = await screen.findByAltText('Source image #2');
    await waitFor(() => {
      expect(image).not.toBeInTheDocument();
    });

    // Expect only one image to be in the list
    const images = await screen.findAllByAltText(/^source image #\d$/i);
    expect(images).toHaveLength(1);
  });
});

describe('annotating', () => {
  it('does not display annotaion list without uploaded images', async () => {
    render(<App />);
    const addWordButton = screen.queryByText(/^add annotation$/i);
    await waitFor(() => {
      expect(addWordButton).not.toBeInTheDocument();
    });
  });

  it('displays annotation list when there is an image', async () => {
    await uploadTestImage('test');
    const addWordButton = await screen.findByText(/^add annotation$/i);
    expect(addWordButton).toBeInTheDocument();
  });

  it('adds a word to the annotation list', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');

    // Check if the word is added to the list
    const word = await screen.findByText('test-annotation');
    expect(word).toBeInTheDocument();
  });

  it('edits a word in the annotation list', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');

    // Check if the word is added to the list
    const word = await screen.findByText('test-annotation');
    expect(word).toBeInTheDocument();

    // Hover over the button so that the edit button is displayed
    const annotationItem = word.parentElement;
    await userEvent.hover(annotationItem);

    // Click the edit button
    const editButton = await screen.getByLabelText(/^Edit Annotation$/i);
    await userEvent.click(editButton);

    // Check if the input field is displayed
    const input = await screen.findByRole('textbox');
    expect(input).toBeInTheDocument();

    // Mock the backend response for editing the word
    const params = new URLSearchParams({
      associated_image: 'test',
      old_word: 'test-annotation',
      new_word: 'edited-annotation',
    }).toString();
    when(Endpoint.put, { times: 1 })
      .calledWith('/word/?' + params)
      .thenResolve({ data: 'Mock response' });

    // Change the word
    await userEvent.clear(input);
    await userEvent.type(input, 'edited-annotation');
    // await userEvent.type(input, '{enter}');

    // Simulate pressing Enter key
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(Endpoint.put).toHaveBeenCalledWith('/word/?' + params);

    // Check if the word is changed in the list
    const editedWord = await screen.findByText('edited-annotation');
    expect(editedWord).toBeInTheDocument();
  });
});

describe('segmenting', () => {
  it('does not display segmenting controls without uploaded images', async () => {
    render(<App />);
    const segmentButton = screen.queryByText(/^auto segment$/i);
    await waitFor(() => {
      expect(segmentButton).not.toBeInTheDocument();
    });
  });

  it('displays segmenting controls when there is an image', async () => {
    await uploadTestImage('test');
    const segmentButton = await screen.findByText(/^auto segment$/i);
    expect(segmentButton).toBeInTheDocument();
  });

  it('adds inclusion points to the selected image', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');
    await selectAnnotation('test-annotation');
    await addInclusionPoint(window.innerWidth / 2, window.innerHeight / 2);

    const segmentButtonText = await screen.findByText(/^auto segment$/i);
    const segmentButton = segmentButtonText.parentElement;

    // Segment button should be enabled
    expect(segmentButton).not.toBeDisabled();

    when(Endpoint.get, { times: 1 })
      .calledWith('api/masks/by-image/test/by-word/test-annotation/')
      .thenResolve({ data: ['test-mask'] });

    // Click the auto segment button
    await userEvent.click(segmentButton);

    expect(Endpoint.post).toHaveBeenCalledWith('sam2/', expect.any(FormData));
  });

  it('clears all inclusion points', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');
    await selectAnnotation('test-annotation');
    await addInclusionPoint(window.innerWidth / 2, window.innerHeight / 2);

    // Check if segment button is enabled
    const segmentButtonText = await screen.findByText(/^auto segment$/i);
    const segmentButton = segmentButtonText.parentElement.parentElement;
    expect(segmentButton).not.toBeDisabled();

    const clearButtonText = await screen.findByText(/^clear all prompts$/i);
    const clearButton = clearButtonText.parentElement;

    // Click the clear all button
    await userEvent.click(clearButton);

    // Check if the segment button is disabled after clearing the inclusion points
    expect(segmentButton).toBeDisabled();
  });

  it('adds bounding boxes to the selected image', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');
    await selectAnnotation('test-annotation');

    when(Endpoint.get, { times: 1 })
      .calledWith('api/masks/by-image/test/by-word/test-annotation/')
      .thenResolve({ data: ['test-mask'] });

    // Check if the segment button is disabled
    const segmentButtonText = await screen.findByText(/^auto segment$/i);
    const segmentButton = segmentButtonText.parentElement.parentElement;
    expect(segmentButton).toBeDisabled();

    // Select the bounding box tool
    const boundingBoxText = await screen.findByText(/^bounding box$/i);
    const boundingBoxButton = boundingBoxText.parentElement;
    await userEvent.click(boundingBoxButton);

    const imagePreview = await screen.findByAltText('Selected source-image preview');

    // Draw a bounding box
    await fireEvent.mouseDown(imagePreview, { clientX: 0, clientY: 0 });
    await fireEvent.mouseMove(imagePreview, { clientX: 50, clientY: 50 });
    await fireEvent.mouseUp(imagePreview);

    // Check if the segment button is enabled after adding a bounding box
    expect(segmentButton).not.toBeDisabled();

    await userEvent.click(segmentButton);

    expect(Endpoint.post).toHaveBeenCalledWith('sam2/', expect.any(FormData));
  });

  it('removes inclusion points with the eraser tool', async () => {
    await uploadTestImage('test');
    await addAnnotation('test', 'test-annotation');
    await selectAnnotation('test-annotation');
    await addInclusionPoint(window.innerWidth / 2, window.innerHeight / 2);

    // Check if segment button is enabled
    const segmentButtonText = await screen.findByText(/^auto segment$/i);
    const segmentButton = segmentButtonText.parentElement.parentElement;
    expect(segmentButton).not.toBeDisabled();

    // Select the eraser tool
    const eraserText = await screen.findByText(/^eraser$/i);
    const eraserButton = eraserText.parentElement;
    await userEvent.click(eraserButton);

    // Click on the inclusion point to remove it
    const inclusionPoint = document.querySelector('.point.inclusion');
    await userEvent.click(inclusionPoint);

    // Wait for the inclusion point removal transition to finish
    await waitFor(() => {
      expect(inclusionPoint).not.toBeInTheDocument();
    });

    // Check if the segment button is disabled after removing the inclusion point
    expect(segmentButton).toBeDisabled();
  });
});
