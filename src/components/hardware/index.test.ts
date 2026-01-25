import getHardware from './index';

describe('hardware component tests', () => {
    let originalGetContext: any;

    beforeAll(() => {
        originalGetContext = HTMLCanvasElement.prototype.getContext;
    });

    afterAll(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    test("getHardware returns valid structure even when WebGL is blocked", async () => {
        // Mock getContext to return null (simulating WebGL being disabled/blocked)
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null);

        const result = await getHardware();

        expect(result).toBeDefined();
        if (result) {
            expect(result.videocard).toBe("undefined");
            expect(result.deviceMemory).toBeDefined();
            expect(result.architecture).toBeDefined();
        }
    });

    test("getHardware handles WebGL getParameter throwing gracefully", async () => {
        // Mock a broken WebGL context
        const mockGl = {
            getParameter: jest.fn().mockImplementation(() => {
                throw new Error("WebGL error");
            }),
            getExtension: jest.fn().mockReturnValue(null),
            VENDOR: 1,
            RENDERER: 2,
            VERSION: 3,
            SHADING_LANGUAGE_VERSION: 4
        };

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl);

        const result = await getHardware();

        expect(result).toBeDefined();
        if (result) {
            expect(result.videocard).toBe("undefined");
        }
    });

    test("getHardware handles WebGL getExtension returning null", async () => {
        // Mock a context where getParameter works but getExtension (debug info) returns null
        const mockGl = {
            getParameter: jest.fn().mockImplementation((param) => {
                if (param === 1) return "Mock Vendor"; // VENDOR
                if (param === 2) return ""; // RENDERER (empty to trigger getExtension check)
                return "Mock Value";
            }),
            getExtension: jest.fn().mockReturnValue(null),
            VENDOR: 1,
            RENDERER: 2,
            VERSION: 3,
            SHADING_LANGUAGE_VERSION: 4
        };

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl);

        const result = await getHardware();

        expect(result).toBeDefined();
        if (result) {
            expect(result.videocard).toBeDefined();
            const videocard = result.videocard as any;
            expect(videocard.vendor).toBe("Mock Vendor");
            expect(videocard.renderer).toBe("");
            // Should not have unmasked fields
            expect(videocard.vendorUnmasked).toBeUndefined();
        }
    });
});
