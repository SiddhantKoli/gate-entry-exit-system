import * as faceapi from '@vladmandic/face-api';

export const loadModels = async () => {
    const MODEL_URL = '/models';
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
};

export const getFaceDescriptor = async (videoElement: HTMLVideoElement) => {
    const detections = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) return null;
    return detections.descriptor;
};

export const compareFaces = (descriptor1: number[], descriptor2: number[]) => {
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    return distance < 0.6; // Threshold for match
};
