import { postToFacebookSchema, postToFacebookAction } from '../../src/tools/facebook/postToFacebook';
import { ActionRegistry } from '../../src/core/ActionRegistry';

describe('Facebook Post Action - Unit Tests', () => {
  it('should validate valid inputs with defaults', () => {
    const parsed = postToFacebookSchema.parse({
      filePath: '/path/to/video.mp4',
    });

    expect(parsed.filePath).toBe('/path/to/video.mp4');
    expect(parsed.caption).toBe('');
    expect(parsed.isReel).toBe(false);
    expect(parsed.addAiLabel).toBe(true);
  });

  it('should validate full inputs correctly', () => {
    const input = {
      filePath: 'C:/assets/photo.jpg',
      caption: 'Awesome test giveaway! #giveaway',
      isReel: true,
      pageId: '123456789',
      addAiLabel: false,
    };

    const parsed = postToFacebookSchema.parse(input);
    expect(parsed).toEqual(input);
  });

  it('should reject missing filePath', () => {
    expect(() => {
      postToFacebookSchema.parse({});
    }).toThrow();
  });

  it('should register successfully in ActionRegistry and execute action', async () => {
    const registry = new ActionRegistry();
    registry.register(postToFacebookAction);

    const definitions = registry.getDefinitions();
    const fbAction = definitions.find(d => d.id === 'facebook-post');

    expect(fbAction).toBeDefined();
    expect(fbAction?.name).toBe('Post to Facebook');
    expect(fbAction?.category).toBe('interaction');

    // Test execution through ActionRegistry
    const execution = await registry.execute(
      'facebook-post',
      { filePath: '/dummy/path.mp4', caption: 'Test' },
      async (validated) => {
        return {
          success: true,
          filePath: validated.filePath,
          caption: validated.caption,
        };
      }
    );

    expect(execution.status).toBe('success');
    expect(execution.output.success).toBe(true);
    expect(execution.output.filePath).toBe('/dummy/path.mp4');
  });
});
