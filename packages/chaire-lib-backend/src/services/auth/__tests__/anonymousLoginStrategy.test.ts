/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import passport from 'passport';
import usersDbQueries from '../../../models/db/users.db.queries';
import { userAuthModel } from '../userAuthModel';

import AnonymousLoginStrategy from '../anonymousLoginStrategy';

process.env.MAGIC_LINK_SECRET_KEY = 'SOMEARBITRARYSTRINGFORASECRETKEY';

// req.logIn needs to be set and is called by passport when successful
const logInFct = jest.fn().mockImplementation((_a, _b, callback) => {
    callback();
});

const newUserId = 7;
// Query results
jest.mock('../../../models/db/users.db.queries', () => ({
    create: jest.fn().mockImplementation(async (attribs) => {
        return {
            id: newUserId,
            uuid: 'arbitrary',
            ...attribs
        }
    })
}));
const mockCreate = usersDbQueries.create as jest.MockedFunction<typeof usersDbQueries.create>;

beforeEach(() => {
    logInFct.mockClear();
    mockCreate.mockClear();
});

const strategy = new AnonymousLoginStrategy(userAuthModel);
passport.use('anonymous-login', strategy);

test('correct name', () => {
    expect(strategy.name).toEqual('anonymousLoginStrategy');
})

test('Anonymous strategy success', async () => {
    const authPromise = new Promise((resolve, reject) => (
        passport.authenticate('anonymous-login')({
            logIn: logInFct
        }, {end: jest.fn()}, (err, result) => {
            resolve({ result, err });
        })
    ));
    await authPromise;
    expect(logInFct).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
        username: expect.stringContaining('anonym_'),
        email: null,
        google_id: null,
        facebook_id: null,
        generated_password: null,
        password: null,
        first_name: '',
        last_name: '',
        is_admin: false,
        is_valid: true,
        is_test: false,
        is_confirmed: true,
        confirmation_token: null,
        preferences: null
    });
    expect(logInFct).toHaveBeenCalledWith({ id: newUserId, username: expect.stringContaining('anonym_'), email: undefined, firstName: '', lastName: '', preferences: {}, serializedPermissions: []}, expect.anything(), expect.anything());
});

test('Anonymous strategy failure', async () => {
    mockCreate.mockRejectedValueOnce('Error creating user');
    const endFct = jest.fn();
    const authPromise = new Promise((resolve, reject) => {
        const res = { 
            end: endFct.mockImplementation((message) => resolve({ result: null, err: message })),
            json: jest.fn().mockImplementation((json) => resolve({ result: json, err: null })),
            setHeader: jest.fn()
        };
        return passport.authenticate('anonymous-login')({
            logIn: logInFct
        }, res, (err, result) => {
            resolve({ result, err });
        })
    });
    await authPromise;
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(logInFct).not.toHaveBeenCalled();
    expect(endFct).toHaveBeenCalledTimes(1);
});